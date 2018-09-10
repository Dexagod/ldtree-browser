import Condition from '../condition/Condition';
import StringContainsCondition from '../condition/StringContainsCondition';
import Session from '../Session';
import Node from '../tree/Node';
import OrCondition from '../condition/OrCondition';
import StringContainedCondition from '../condition/StringContainedCondition';
import Query from './Query';
import SaveCondition from '../condition/SaveCondition';
import FollowCondition from '../condition/FollowCondition';
import SearchCompletedCondition from '../condition/SearchCompletedCondition';
import StringSearchContextUpdater from '../contextUpdater/StringSearchContextUpdater';

export default class SearchStringQuery extends Query{
    searchstring: string;
    saveCondition: SaveCondition;
    followCondition: FollowCondition;

    constructor(searchstring){
        super();
        this.searchstring = searchstring;
        this.saveCondition = new SearchCompletedCondition();
        this.followCondition = new OrCondition(new StringContainedCondition(), new StringContainsCondition());
    }

    async query(): Promise<Session> {
        let toRemove = []
        for (var i = 0; i < this.session.nodes.length; i++){
            if(this.session.context[i]["searchstring"] === undefined || this.session.context[i]["searchstring"] === null){
                this.session.context[i]["searchstring"] = this.searchstring
                this.session.context[i]["leftoverstring"] = "";
            } else {
                if (this.session.context[i]["leftoverstring"] === ""){
                    this.session.context[i]["searchstring"] = this.searchstring
                } else {
                    if (this.searchstring.startsWith(this.session.context[i]["leftoverstring"])){
                        this.session.context[i]["searchstring"] = this.searchstring.slice(this.session.context[i]["leftoverstring"].length);
                        this.session.context[i]["leftoverstring"] = ""
                    } else if (this.session.context[i]["leftoverstring"].startsWith(this.searchstring)){
                        this.session.context[i]["leftoverstring"] = this.session.context[i]["leftoverstring"].slice(this.searchstring.length);
                        this.session.context[i]["searchstring"] = ""
                    } else {
                        // Not the needed letter / lettergroup was provided to proceed on this session node
                        toRemove.push(i);
                    }
                }
            
            }
        }
        for (var i = toRemove.length - 1; i >= 0 ; i--){
            this.session.nodes = this.session.nodes.splice(i)
            this.session.context = this.session.context.splice(i)
        }
        this.session["leafnodes"] = []
        this.session["leafcontext"] = []
        // this.session.updateNodeContext(new StringSearchContextUpdater(this.searchstring));
        let session = await this.queryRecursive(this.session);
        return session;
    
    }

    async queryRecursive(session: Session): Promise<Session>{
        
        let followedChildren = new Array<any>();
        for (var i = 0; i < session.getLength(); i++){
            let node = session.nodes[i];
            let currentContext = session.context[i];
            if (this.saveCondition.check_condition(node, currentContext)){
                let childRelations = await node.getChildRelations();
                this.emitMember(node);
                this.emitNode(node);
                session["leafnodes"].push(node);
                session["leafcontext"].push(currentContext);
                if (childRelations.length == 0){
                    this.emit("leafnode", node);
                }
            }
            for (var relation of await node.getChildRelations()){
                for (var child of await relation.getChildren()){
                    if (this.followCondition.check_condition(node, relation, child, currentContext)){
                        followedChildren.push([node, relation, child, currentContext])
                    }
                }
            }
        }  
        session.nodes = []
        session.context = []
        for (var nrccarray of followedChildren){
            let node: Node =  nrccarray[0]
            let childRelation =  nrccarray[1]
            let child: Node =  nrccarray[2]
            let nodeContext =  nrccarray[3]

            if (child.getValue().startsWith(nodeContext["searchstring"])){
                let rest = child.getValue().slice(nodeContext["searchstring"].length)
                nodeContext["searchstring"] = ""
                nodeContext["leftoverstring"] = rest;
                session.nodes.push(child)
                session.context.push(nodeContext)
            } else if (nodeContext["searchstring"].startsWith(child.getValue())){
                nodeContext["searchstring"] = nodeContext["searchstring"].slice(child.getValue().length)
                nodeContext["leftoverstring"] = "";
                session.nodes.push(child)
                session.context.push(nodeContext)
            } 
        }

        if (session.nodes.length == 0){
            session.nodes = session["leafnodes"]
            session.context = session["leafcontext"]
            delete session["leafnodes"]
            delete session["leafcontext"]
            return session;
        }

        return await this.queryRecursive(session);
        

    }
}



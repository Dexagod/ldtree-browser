import Condition from './Condition';
import ChildRelation from '../tree/ChildRelation';
import Node from '../tree/Node';
import FollowCondition from './FollowCondition';

export default class StringContainedCondition implements FollowCondition {
    flag:string = "";
    check_condition(node:Node, relation:ChildRelation, child:Node, iterationValue) {
        if (child.getValue().startsWith(iterationValue)){
            return true;
        } 
        return false; 
    }
}
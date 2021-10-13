import { MyWorkProvider, MyWorkItem } from "./my-work-provider";
import { OctaneEntity } from "../octane/model/octane-entity";

export class MyMentionsProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        const result = this.service.getMyMentions();
        return result;
    }

    getMyWorkItem(i: OctaneEntity): MyWorkItem {
        const item = super.getMyWorkItem(i);
        item.contextValue = 'comment';
        return item;
    }
}
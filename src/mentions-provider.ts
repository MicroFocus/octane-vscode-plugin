import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "./octane-service";

export class MyMentionsProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        const result = this.service.getMyMentions();
        return result;
    }

}
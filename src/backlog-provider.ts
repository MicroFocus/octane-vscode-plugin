import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "./octane-service";

export class BacklogProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        const result = this.service.getMyBacklog();
        return result;
    }

}
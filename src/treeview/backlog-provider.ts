import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "../octane/model/octane-entity";

export class BacklogProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        const result = this.service.getMyBacklog();
        return result;
    }

}
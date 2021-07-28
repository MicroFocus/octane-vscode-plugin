import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "../octane/service/octane-service"; 

export class MyRequirementsProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        const result = this.service.getMyRequirements();
        return result;
    }

}
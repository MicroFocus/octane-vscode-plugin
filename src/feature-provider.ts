import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "./octane-service"; 

export class MyFeatureProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        const result = this.service.getMyFeatures();
        return result;
    }

}
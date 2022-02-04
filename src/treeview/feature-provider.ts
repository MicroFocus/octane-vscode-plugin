import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "../octane/model/octane-entity";

export class MyFeatureProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        try {
            const result = this.service.getMyFeatures();
            return result;
        } catch (e: any) {
            throw e;

        }
    }

}
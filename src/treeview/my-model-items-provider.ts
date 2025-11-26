import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "../octane/model/octane-entity";

export class MyModelItemsProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        try {
            const result = this.service.getMyModelItems();
            return result;
        } catch (e: any) {
            throw e;
        }

    }

}
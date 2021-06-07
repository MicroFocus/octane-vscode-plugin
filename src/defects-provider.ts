import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "./octane-service";

export class DefectsProvider extends MyWorkProvider {

    getRelevantEntities(): OctaneEntity[] {
        const result = this.service.getMyDefects();
        return result;
    }

}
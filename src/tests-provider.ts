import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "./octane-service";

export class MyTestsProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        const result = this.service.getMyTests();
        return result;
    }

}
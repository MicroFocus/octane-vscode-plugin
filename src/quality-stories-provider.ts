import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "./octane-service";

export class MyQualityStoriesProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        const result = this.service.getMyQualityStories();
        return result;
    }

}
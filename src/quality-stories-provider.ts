import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "./octane-service";

export class MyQualityStoriesProvider extends MyWorkProvider {

    getRelevantEntities(): OctaneEntity[] {
        const result = this.service.getMyQualityStories();
        return result;
    }

}
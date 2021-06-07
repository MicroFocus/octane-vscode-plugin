import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "./octane-service";

export class MyStoriesProvider extends MyWorkProvider {

    getRelevantEntities(): OctaneEntity[] {
        const result = this.service.getMyStories();
        return result;
    }

}
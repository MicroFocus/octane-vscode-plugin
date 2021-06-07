import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "./octane-service";

export class MyStoriesProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
        const result = this.service.getMyStories();
        return result;
    }

}
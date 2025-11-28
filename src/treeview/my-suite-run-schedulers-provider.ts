import { MyWorkProvider } from "./my-work-provider";
import { OctaneEntity } from "../octane/model/octane-entity";

export class MySuiteRunSchedulersProvider extends MyWorkProvider {

    async getRelevantEntities(): Promise<OctaneEntity[]> {
    return this.service.getMySuiteRunSchedulers();
}

}
import { OctaneEntity } from './octane-entity';
import { OctaneEntityHolder } from './octane-entity-holder';
import { QuickPickItem } from 'vscode';


export class OctaneQuickPickItem implements QuickPickItem, OctaneEntityHolder {

    public entity: OctaneEntity;
    public label: string;
    public detail?: string;
    public alwaysShow: boolean = true;
   
    constructor(i: OctaneEntity, searchString: string) {
        this.entity = i;
        this.label = `${i.id} ${i.name} ${i.globalTextSearchResult}`;
        // this.detail = `${searchString}`;
    }


}

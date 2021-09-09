import { User } from './user';
import { OctaneEntity } from './octane-entity';
import { QuickPickItem } from 'vscode';


export class OctaneQuickPickItem implements QuickPickItem {

    private entity: OctaneEntity;
    public label: string;
    public detail?: string;
    public alwaysShow: boolean = true;
   
    constructor(i: OctaneEntity, searchString: string) {
        this.entity = i;
        this.label = `${i.id} ${i.name} ${i.globalTextSearchResult}`;
        // this.detail = `${searchString}`;
    }


}

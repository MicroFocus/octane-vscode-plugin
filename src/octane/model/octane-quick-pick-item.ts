import { User } from './user';
import { OctaneEntity } from './octane-entity';
import { QuickPickItem } from 'vscode';


export class OctaneQuickPickItem implements QuickPickItem {

    private entity: OctaneEntity;
    public label: string;
   
    constructor(i: OctaneEntity) {
        this.entity = i;
        this.label = `${i.id} ${i.globalTextSearchResult}`;
    }


}

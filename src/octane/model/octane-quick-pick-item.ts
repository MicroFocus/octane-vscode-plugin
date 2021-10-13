import { OctaneEntity } from './octane-entity';
import { OctaneEntityHolder } from './octane-entity-holder';
import { QuickPickItem } from 'vscode';
import { stripHtml } from 'string-strip-html';

export class OctaneQuickPickItem implements QuickPickItem, OctaneEntityHolder {

    public entity: OctaneEntity | undefined;
    public label: string;
    public detail?: string;
    public alwaysShow: boolean = true;
    public searchString?: string;

    constructor(i: OctaneEntity | undefined, label: string) {
        this.entity = i;
        if (i) {
            this.label = `${i.id} ${i.name}`;
        } else {
            this.label = `$(search-refresh) ${label}`;
            this.searchString = label;
        }
        if (i && i.globalTextSearchResult) {
            this.detail = `${stripHtml(i.globalTextSearchResult).result}`;
        }
    }

}

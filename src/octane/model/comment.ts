import { stripHtml } from 'string-strip-html';
import { OctaneEntity } from './octane-entity';


export class Comment extends OctaneEntity {

    public text: string;
    public ownerWorkItem?: OctaneEntity;

    constructor(i?: any) {
        super(i);
        this.text = (i && i.text) ? i.text : '';
        if (i?.owner_work_item) {
            this.ownerWorkItem = new OctaneEntity(i.owner_work_item);
            this.ownerWorkItem.subtype = this.ownerWorkItem.type;
            this.ownerWorkItem.type = "work_item";
        }
    }

    getStrippedText(): string {
        return stripHtml(this.text).result;
    }
}

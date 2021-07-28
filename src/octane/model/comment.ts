import { stripHtml } from 'string-strip-html';
import { OctaneEntity } from './octane-entity';


export class Comment extends OctaneEntity {

    public text: string;

    constructor(i?: any) {
        super(i);
        this.text = (i && i.text) ? i.text : '';
    }

    getStrippedText(): string {
        return stripHtml(this.text).result;
    }
}

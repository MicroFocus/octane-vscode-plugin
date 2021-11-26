import { stripHtml } from 'string-strip-html';
import { OctaneEntity } from './octane-entity';


export class Task extends OctaneEntity {

    public story?: OctaneEntity;

    constructor(i?: any) {
        super(i);
        this.story = (i && i.story) ? new OctaneEntity({
            type: 'work_item',
            subtype: i.story.type,
            id: i.story.id
        }) : undefined;
    }

}

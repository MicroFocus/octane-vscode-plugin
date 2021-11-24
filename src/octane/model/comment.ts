import { stripHtml } from 'string-strip-html';
import { OctaneEntity } from './octane-entity';


export class Comment extends OctaneEntity {

    public text: string;
    public ownerEntity?: OctaneEntity;

    constructor(i?: any) {
        super(i);
        this.text = (i && i.text) ? i.text : '';
        if (i?.owner_work_item) {
            this.ownerEntity = new OctaneEntity(i.owner_work_item);
            this.ownerEntity.subtype = this.ownerEntity.type;
            this.ownerEntity.type = "work_item";
        }
        if (i?.owner_requirement) {
            this.ownerEntity = new OctaneEntity(i.owner_requirement);
            this.ownerEntity.subtype = this.ownerEntity.type;
            this.ownerEntity.type = "requirement";
        }
        if (i?.owner_test) {
            this.ownerEntity = new OctaneEntity(i.owner_test);
            this.ownerEntity.subtype = this.ownerEntity.type;
            this.ownerEntity.type = "test";
        }
        if (i?.owner_run) {
            this.ownerEntity = new OctaneEntity(i.owner_run);
            this.ownerEntity.subtype = this.ownerEntity.type;
            this.ownerEntity.type = "run";
        }
        if (i?.owner_bdd_spec) {
            this.ownerEntity = new OctaneEntity(i.owner_bdd_spec);
            this.ownerEntity.type = this.ownerEntity.type;
        }
    }

    getStrippedText(): string {
        return stripHtml(this.text).result;
    }
}

import { OctaneEntity } from './octane-entity';


export class Transition {

    public id: string;
    public entity?: string;
    public logicalName?: string;
    public sourcePhase?: OctaneEntity;
    public targetPhase?: OctaneEntity;

    constructor(i?: any) {
        this.id = i?.id ?? null;
        this.entity = i?.entity ?? '';
        this.logicalName = i?.logical_name ?? '';
        if (i.source_phase) {
            if (i.source_phase.data) {
                this.sourcePhase = i.source_phase.data.map((ref: any) => new OctaneEntity(ref));
            } else {
                this.sourcePhase = new OctaneEntity(i.source_phase);
            }
        }
        if (i.target_phase) {
            if (i.target_phase.data) {
                this.targetPhase = i.target_phase.data.map((ref: any) => new OctaneEntity(ref));
            } else {
                this.targetPhase = new OctaneEntity(i.target_phase);
            }
        }
    }
}

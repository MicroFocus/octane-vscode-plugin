import { User } from './user';
import { BaseEntity } from './base-entity';



export class OctaneEntity extends BaseEntity {

    public storyPoints?: string;
    public phase?: BaseEntity;
    public references?: OctaneEntity[];
    public owner?: User;
    public investedHours?: string;
    public remainingHours?: string;
    public estimatedHours?: string;
    public detectedBy?: User;
    public severity?: string;
    public subtype?: string;
    public author?: User;
    public label?: string;
    public globalTextSearchResult?: string;

    constructor(i?: any) {
        super(i);
        this.storyPoints = i?.story_points;
        this.investedHours = i?.invested_hours;
        this.remainingHours = i?.remaining_hours;
        this.estimatedHours = i?.estimated_hours;
        this.detectedBy = i?.detected_by ? new User(i?.detected_by) : undefined;
        this.severity = i?.severity?.id;
        this.owner = i?.owner ? new User(i?.owner) : undefined;
        this.author = i?.author ? new User(i?.author) : undefined;
        this.phase = new BaseEntity(i?.phase);
        this.subtype = i?.subtype ?? '';
        this.globalTextSearchResult = i?.global_text_search_result ?? '';
        switch (this.subtype) {
            case 'defect':
                this.label = 'D';
                break;
            case 'story':
                this.label = 'US';
                break;
            case 'quality_story':
                this.label = 'QS';
                break;
            case 'feature':
                this.label = 'F';
                break;
            case 'scenario_test':
                this.label = 'BSC';
                break;
            case 'test_manual':
                this.label = 'MT';
                break;
            case 'auto_test':
                this.label = 'AT';
                break;
            case 'gherkin_test':
                this.label = 'GT';
                break;
            case 'test_suite':
                this.label = 'TS';
                break;
            case 'run_manual':
                this.label = 'MR';
                break;
            case 'run_suite':
                this.label = 'SR';
                break;

            case '':
            case undefined:
                switch (this.type) {
                    case 'task':
                        this.label = 'T';
                        break;
                    case 'bdd_spec':
                        this.label = 'BSP';
                        break;
                }
                break;
        }
    }


}

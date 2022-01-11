import { getLogger } from 'log4js';
import { TextInputTemplate } from './text-input-template';

export class ProgressInputTemplate extends TextInputTemplate {

    private valueObject: any | undefined;

    constructor(field: any, value: string) {
        super(field, value);
        if (this.value !== '') {
            try {
                this.valueObject = JSON.parse(this.value);
            } catch (e: any) {
                getLogger('vs').error(`While evaluating JSON value: ${this.value} `, e);
            }
            this.value = (this.valueObject?.tasksInvestedHoursSumTotal ?? 0) + ' Invested hours, ' + (this.valueObject?.tasksRemainingHoursSumTotal ?? 0) + ' Remaining hours, ' + (this.valueObject?.tasksEstimatedHoursSumTotal ?? 0) + ' Estimated hours';
        }
    }

    protected generateType() {
        return '';
    }

    protected generateTooltip(): string {
        return 'title="<em>Progress</em> <br/> ' + (this.valueObject?.tasksInvestedHoursSumTotal ?? 0) + ' Invested hours <br /> ' + (this.valueObject?.tasksRemainingHoursSumTotal ?? 0) + ' Remaining hours <br /> ' + (this.valueObject?.tasksEstimatedHoursSumTotal ?? 0) + ' Estimated hours <br />" ';
    }

    protected generateReadonly(): string {
        return 'readonly';
    }
}
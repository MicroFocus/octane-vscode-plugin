import { TextInputTemplate } from './text-input-template';

export class DateTimeInputTemplate extends TextInputTemplate {

    constructor(field: any, value: string, visible: boolean) {
        super(field, value, visible);
    }

    protected generateType() {
        return '';
    }

    protected generateAdditionalAttributes() {
        return `data-toggle="datetimepicker" class="datetimepicker-input" data-target="#${this.field.name}"`;
    }

    protected generateTooltip(): string {
        return `title="${new Date(this.value).toLocaleString()}"`;
    }
}
import { TextInputGenerator } from './text-input-generator';

export class DateTimeInputGenerator extends TextInputGenerator {

    constructor(field: any, value: string) {
        super(field, value);
    }

    protected generateType() {
        return '';
    }

    protected generateAdditionalAttributes() {
        return `data-toggle="datetimepicker" class="datetimepicker-input" data-target="#${this.field.name}"`;
    }

}
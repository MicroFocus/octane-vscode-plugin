import { FieldTemplate} from './field-template';
export abstract class AbstractFieldTemplate implements FieldTemplate {
 
    protected fieldId: string;

    constructor(protected field: any, protected value: any) {
        this.fieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
    }

    abstract generate(): string;

    protected generateReadonly() {
        return this.field.editable ? '' : 'readonly';
    }

    protected generateDisable(field: any): string {
        if (field.name === 'author') {
            return 'disabled';
        }
        return field.editable ? '' : 'disabled';
    }
}
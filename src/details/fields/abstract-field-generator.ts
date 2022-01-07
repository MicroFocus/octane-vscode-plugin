import { FieldGenerator} from './field-generator';
export abstract class AbstractFieldGenerator implements FieldGenerator {
 
    protected fieldId: string;

    constructor(protected field: any, protected value: any) {
        this.fieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
    }

    abstract generate(): string;

    protected generateReadonly() {
        return this.field.editable ? '' : 'readonly';
    }
}
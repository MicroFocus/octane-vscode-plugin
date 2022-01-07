abstract class AbstractFieldGenerator implements FieldGenerator {
 
    protected fieldId: string;

    constructor(protected field: any, protected value: any) {
        this.fieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
    }

    abstract generate(): string;

    protected generateReadonly() {
        return this.field.editable ? '' : 'readonly';
    }

    protected generateSelected(isSelected: boolean) : string {
        return isSelected ? 'selected="selected"' : '';
    }

    protected generateMultiple(isMultiple: boolean) : string {
        return isMultiple ? 'multiple="multiple"' : '';
    }

    protected generateDisable(field: any): string {
        if (field.name === 'author') {
            return 'disabled';
        }
        return field.editable ? '' : 'disabled';
    }
}
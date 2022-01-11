import { FieldTemplate} from './field-template';

export abstract class AbstractFieldTemplate implements FieldTemplate {
 
    protected fieldId: string;

    constructor(protected field: any, protected entity: any) {
        if(field.label) {
            this.fieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
        } else {
         this.fieldId = field;   
        }
    }

    public generate(): string {
        return `<div class="${this.generateContainerClass()}" id="container_${this.fieldId}">
                    <label name="${this.field.name}">${this.field.label}</label>
                    ${this.generateInputField()}
                </div>`;
    }

    abstract generateInputField(): string;

    protected generateContainerClass(): string {
        return 'container';
    }

    protected generateReadonly(): string {
        return this.field.editable ? '' : 'readonly';
    }

    protected generateDisable(field: any): string {
        if (field.name === 'author') {
            return 'disabled';
        }
        return field.editable ? '' : 'disabled';
    }

    protected getFieldBooleanValue(data: any, fieldName: string): boolean {
        const fieldValue = data[fieldName];
        if (fieldValue) {
            return fieldValue;
        }
        return false;
    }

    protected getFieldValue(data: any, fieldName: string): string | any[] {
        const fieldValue = this.getFieldSimpleValue(data, fieldName);
        if (fieldValue['data']) {
            const ref: string[] = [];
            fieldValue['data'].forEach((r: any) => {
                ref.push(r.name);
            });
            return ref.length ? ref : '';
        }
        if (fieldValue === null || fieldValue === undefined) {
            return '';
        }
        return fieldValue;
    }

    protected getFieldStringValue(data: any, fieldName: string): string {
        const fieldValue = this.getFieldSimpleValue(data, fieldName);
        if (fieldValue === null || fieldValue === undefined) {
            return '';
        }
        if (fieldValue['data']) {
            let ref: string = '';
            fieldValue['data'].forEach((r: any) => {
                ref += " " + r.name;
            });
            return ref;
        }
        return fieldValue;
    }

    protected getFieldReferencedValue(data: any, fieldName: string): undefined | any[] {
        const fieldValue = this.getFieldSimpleValue(data, fieldName);
        if (fieldValue === null || fieldValue === undefined) {
            return undefined;
        }
        if (fieldValue['data']) {
            return fieldValue['data'];
        }
        return [fieldValue];
    }

    protected getFieldSimpleValue(data: any, fieldName: string): any | undefined {
        const fieldValue = data[fieldName];
        if (fieldValue === null || fieldValue === undefined) {
            return undefined;
        }
        if (fieldValue['name']) {
            return fieldValue['name'];
        }
        if (fieldValue['full_name']) {
            return fieldValue['full_name'];
        }
        return fieldValue;
    }
}
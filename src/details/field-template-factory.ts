
import { TextInputTemplate } from './fields/text-input-template';
import { BooleanInputTemplate } from './fields/boolean-input-template';
import { ReferenceInputTemplate } from './fields/reference-input-template';
import { FieldTemplate } from './fields/field-template';
import { DateTimeInputTemplate } from './fields/date-time-input-template';

export class FieldTemplateFactory {

    public static generate(field: any, data: any) : string {
        let generator: FieldTemplate;
        switch (field.field_type) {

            case 'date_time':
                generator = new DateTimeInputTemplate(field, FieldTemplateFactory.getFieldStringValue(data, field.name));
                break;

            case 'boolean':
                generator = new BooleanInputTemplate(field, FieldTemplateFactory.getFieldBooleanValue(data, field.name));
                break;

            case 'integer':
                generator = new TextInputTemplate(field, FieldTemplateFactory.getFieldStringValue(data, field.name), 'number');
                break;

            case 'reference':
                generator = new ReferenceInputTemplate(field, FieldTemplateFactory.getFieldReferencedValue(data, fieldNameMap.get(field.name) ?? field.name), field.field_type_data.multiple);
                break;

            default:
                generator = new TextInputTemplate(field, FieldTemplateFactory.getFieldStringValue(data, field.name));
                break;
        }
        if (generator !== undefined) {
            return generator.generate();
        }
        return '';
    }

    private static getFieldBooleanValue(data: any, fieldName: string): boolean {
        const fieldValue = data[fieldName];
        if (fieldValue) {
            return fieldValue;
        }
        return false;
    }

    private static getFieldValue(data: any, fieldName: string): string | any[] {
        const fieldValue = FieldTemplateFactory.getFieldSimpleValue(data, fieldName);
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

    private static getFieldStringValue(data: any, fieldName: string): string {
        const fieldValue = FieldTemplateFactory.getFieldSimpleValue(data, fieldName);
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

    private static getFieldReferencedValue(data: any, fieldName: string): undefined | any[] {
        const fieldValue = FieldTemplateFactory.getFieldSimpleValue(data, fieldName);
        if (fieldValue === null || fieldValue === undefined) {
            return undefined;
        }
        if (fieldValue['data']) {
            return fieldValue['data'];
        }
        return [fieldValue];
    }

    private static getFieldSimpleValue(data: any, fieldName: string): any | undefined {
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

const fieldNameMap: Map<String, String> = new Map([
    ['application_module', 'product_areas']
]);
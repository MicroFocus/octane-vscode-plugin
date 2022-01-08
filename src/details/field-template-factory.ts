
import { TextInputTemplate } from './fields/text-input-template';
import { BooleanInputTemplate } from './fields/boolean-input-template';
import { ReferenceInputTemplate } from './fields/reference-input-template';
import { FieldTemplate } from './fields/field-template';
import { DateTimeInputTemplate } from './fields/date-time-input-template';

const fieldNameToAttributeMap: Map<String, String> = new Map([
    ['application_module', 'product_areas']
]);
export class FieldTemplateFactory {

    public static getTemplate(field: any, data: any) : FieldTemplate {
        let template: FieldTemplate;
        switch (field.field_type) {

            case 'date_time':
                template = new DateTimeInputTemplate(field, FieldTemplateFactory.getFieldStringValue(data, field.name));
                break;

            case 'boolean':
                template = new BooleanInputTemplate(field, FieldTemplateFactory.getFieldBooleanValue(data, field.name));
                break;

            case 'integer':
                template = new TextInputTemplate(field, FieldTemplateFactory.getFieldStringValue(data, field.name), 'number');
                break;

            case 'reference':
                // application_module needs remapping to product_areas
                let fieldName = fieldNameToAttributeMap.get(field.name) ?? field.name;
                template = new ReferenceInputTemplate(field, FieldTemplateFactory.getFieldReferencedValue(data, fieldName), field.field_type_data.multiple);
                break;

            default:
                template = new TextInputTemplate(field, FieldTemplateFactory.getFieldStringValue(data, field.name));
                break;
        }
        return template;
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


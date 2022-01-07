
import { TextInputGenerator } from './fields/text-input-generator';
import { BooleanInputGenerator } from './fields/boolean-input-generator';
import { ReferenceInputGenerator } from './fields/reference-input-generator';
import { FieldGenerator } from './fields/field-generator';
import { DateTimeInputGenerator } from './fields/date-time-input-generator';

export class FieldGeneratorFactory {

    public static generate(field: any, data: any) : string {
        let generator: FieldGenerator;
        switch (field.field_type) {

            case 'date_time':
                generator = new DateTimeInputGenerator(field, FieldGeneratorFactory.getFieldStringValue(data, field.name));
                break;

            case 'boolean':
                generator = new BooleanInputGenerator(field, FieldGeneratorFactory.getFieldBooleanValue(data, field.name));
                break;

            case 'integer':
                generator = new TextInputGenerator(field, FieldGeneratorFactory.getFieldStringValue(data, field.name), 'number');
                break;

            case 'reference':
                generator = new ReferenceInputGenerator(field, FieldGeneratorFactory.getFieldReferencedValue(data, fieldNameMap.get(field.name) ?? field.name), field.field_type_data.multiple);
                break;

            default:
                generator = new TextInputGenerator(field, FieldGeneratorFactory.getFieldStringValue(data, field.name));
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
        const fieldValue = FieldGeneratorFactory.getFieldSimpleValue(data, fieldName);
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
        const fieldValue = FieldGeneratorFactory.getFieldSimpleValue(data, fieldName);
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
        const fieldValue = FieldGeneratorFactory.getFieldSimpleValue(data, fieldName);
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
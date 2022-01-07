
import { TextInputGenerator } from './fields/text-input-generator';
import { BooleanInputGenerator } from './fields/boolean-input-generator';

class FieldGeneratorFactory {

    public static generate(field: any, data: any) {
        let generator: AbstractFieldGenerator;
        switch (field.field_type) {
            case 'boolean':
                generator = new BooleanInputGenerator(field, FieldGeneratorFactory.getFieldBooleanValue(data, field.name));
                break;

            case 'integer':
                generator = new TextInputGenerator(field, FieldGeneratorFactory.getFieldStringValue(data, field.name), 'number');
                break;

            default:
                generator = new TextInputGenerator(field, FieldGeneratorFactory.getFieldStringValue(data, field.name));
                break;
        }
        if (generator !== undefined) {
            generator.generate();
        }
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
        if (fieldValue['data']) {
            let ref: string = '';
            fieldValue['data'].forEach((r: any) => {
                ref += " " + r.name;
            });
            return ref;
        }
        if (fieldValue === null || fieldValue === undefined) {
            return '';
        }
        return fieldValue;
    }

    private static getFieldSimpleValue(data: any, fieldName: string): string | undefined {
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
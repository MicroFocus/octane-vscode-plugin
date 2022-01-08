
import { TextInputTemplate } from './fields/text-input-template';
import { BooleanInputTemplate } from './fields/boolean-input-template';
import { ReferenceInputTemplate } from './fields/reference-input-template';
import { FieldTemplate } from './fields/field-template';
import { DateTimeInputTemplate } from './fields/date-time-input-template';


export class FieldTemplateFactory {

    public static getTemplate(field: any, data: any) : FieldTemplate {
        let template: FieldTemplate;
        switch (field.field_type) {

            case 'date_time':
                template = new DateTimeInputTemplate(field, data);
                break;

            case 'boolean':
                template = new BooleanInputTemplate(field, data);
                break;

            case 'reference':
                template = new ReferenceInputTemplate(field, data);
                break;

            case 'integer':
            default:
                template = new TextInputTemplate(field, data);
                break;
        }
        return template;
    }

}


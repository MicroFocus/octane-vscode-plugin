import { FieldsSelectInputTemplate } from "./action-buttons/fields-select-input-template";
import { FieldTemplate } from "./fields/field-template";


export class ActionButtonTemplateFactory {

    public static getTemplate(actionName: string, field: any, data: any, visible: boolean, additionalArg?: any): FieldTemplate {
        
        switch (actionName) {
            case 'fields_select': 
                return new FieldsSelectInputTemplate(actionName, field, data, visible, additionalArg);
            default:
                return new FieldsSelectInputTemplate(actionName, field, data, visible, additionalArg);
        }

    }

}
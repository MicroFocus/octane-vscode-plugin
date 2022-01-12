import { FieldTemplate } from "./fields/field-template";
import { FieldsSelectButtonTemplate } from "./action-buttons/fields-select-button-template";
import { CommentButtonTemplate } from "./action-buttons/comment-button-template";

export class ActionButtonTemplateFactory {

    public static getTemplate(actionName: string, field: any, data: any, visible: boolean, additionalArg?: any): FieldTemplate {
        
        switch (actionName) {
            case 'fields_select': 
                return new FieldsSelectButtonTemplate(actionName, field, data, visible, additionalArg);

            case 'comments':
                return new CommentButtonTemplate(actionName, field, data, visible, additionalArg);
                
            default:
                return new FieldsSelectButtonTemplate(actionName, field, data, visible, additionalArg);
        }

    }

}
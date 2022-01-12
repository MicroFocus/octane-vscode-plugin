import { FieldTemplate } from "./fields/field-template";
import { FieldsSelectButtonTemplate } from "./action-buttons/fields-select-button-template";
import { CommentButtonTemplate } from "./action-buttons/comment-button-template";
import { SaveButtonTemplate } from "./action-buttons/save-button-template";
import { RefreshButtonTemplate } from "./action-buttons/refresh-button-template";

export class ActionButtonTemplateFactory {

    public static getTemplate(actionName: string): FieldTemplate {

        switch (actionName) {
            case 'comments':
                return new CommentButtonTemplate(actionName);

            case 'save':
                return new SaveButtonTemplate(actionName);

            case 'refresh':
                return new RefreshButtonTemplate(actionName);

            default:
                return new SaveButtonTemplate(actionName);
        }

    }

}
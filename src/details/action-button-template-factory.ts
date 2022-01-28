import { CommentButtonTemplate } from "./action-buttons/comment-button-template";
import { SaveButtonTemplate } from "./action-buttons/save-button-template";
import { RefreshButtonTemplate } from "./action-buttons/refresh-button-template";
import { OpenInBrowserButtonTemplate } from "./action-buttons/open-in-browser-button-template";
import { AddToMyWorkButtonTemplate } from "./action-buttons/add-to-my-work-button-template";
import { ButtonTemplate } from "./action-buttons/button-template";

export class ActionButtonTemplateFactory {

    public static getTemplate(actionName: string): ButtonTemplate {

        switch (actionName) {
            case 'comments':
                return new CommentButtonTemplate(actionName);

            case 'save':
                return new SaveButtonTemplate(actionName);

            case 'refresh':
                return new RefreshButtonTemplate(actionName);

            case 'openInBrowser':
                return new OpenInBrowserButtonTemplate(actionName);

            case 'addToMyWork':
                return new AddToMyWorkButtonTemplate(actionName);

            default:
                return new SaveButtonTemplate(actionName);
        }
        
    }

}
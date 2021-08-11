import { OctaneService } from "./octane-service";
import * as vscode from 'vscode';


export class InformationMessageService {

    private static _instance: InformationMessageService;

    public static getInstance(): InformationMessageService {
        if (!InformationMessageService._instance) {
            InformationMessageService._instance = new InformationMessageService();
        }
        return InformationMessageService._instance;
    }

    public onSuccess(message: string) {
        vscode.window.showInformationMessage(message);
    }

    public onError(message: string, error: any) {
        vscode.window.showErrorMessage(message + error);
    }

    public onWarn(message: string) {
        vscode.window.showWarningMessage(message);
    }

}
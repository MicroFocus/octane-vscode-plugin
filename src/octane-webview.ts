import * as vscode from 'vscode';
import * as Octane from '@microfocus/alm-octane-js-rest-sdk';
import { MyWorkItem } from './my-work-provider';
import { OctaneEntity } from './octane-service';

export class OctaneWebview {

    public static myWorkScheme = 'alm-octane-entity';
    
    public static register(context: vscode.ExtensionContext) {
        return vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.details',
            async (node: MyWorkItem) => {
                const data = node.entity;
                const uri = vscode.Uri.parse(`${this.myWorkScheme}:${JSON.stringify(data)}`);

                const panel = vscode.window.createWebviewPanel(
                    'myEditor',
                    data?.id ?? '',
                    vscode.ViewColumn.One,
                    {}
                );
                panel.webview.html = getHtmlForWebview(panel.webview, context, data);
            });
    }
}

function getDataForSubtype(entity: OctaneEntity | undefined): [string, string] {
    if (entity?.subtype) {
        if (entity?.subtype === 'defect')
            return ["D", "#b21646"]
        if (entity?.subtype === 'story')
            return ["US", "#ffb000"]
        if (entity?.subtype === 'quality_story')
            return ["QS", "#33c180"]
        if (entity?.subtype === 'feature')
            return ["F", "#e57828"]
        if (entity?.subtype === 'scenario_test')
            return ["BSC", "#75da4d"]
        if (entity?.subtype === 'test_manual')
            return ["MT", "#00abf3"]
        if (entity?.subtype === 'auto_test')
            return ["AT", "#9b1e83"]
        if (entity?.subtype === 'gherkin_test')
            return ["GT", "#00a989"]
        if (entity?.subtype === 'test_suite')
            return ["TS", "#271782"]
    }
    return ['', ''];
}

function getHtmlForWebview(webview: vscode.Webview, context: any, data: OctaneEntity | undefined): string {
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
        context.extensionUri, 'media', 'vscode.css'));
    const myStyle = webview.asWebviewUri(vscode.Uri.joinPath(
        context.extensionUri, 'media', 'my-css.css'));
    return `
        <!DOCTYPE html>
        <head>
            <link href="${styleVSCodeUri}" rel="stylesheet" />
            <link href="${myStyle}" rel="stylesheet" />
        </head>
        <body>
            <div class="top-container">
                <div class="icon-container" style="background-color: ${getDataForSubtype(data)[1]}">
                    <span class="label">${getDataForSubtype(data)[0]}</span>
                </div>
                <div class="name-container">
                    <h3>${data?.name ?? '-'}</h3>
                </div>
                <div class="action-container">
                    <select name="action" class="action">
                        <option value="saab">In progress</option>
                        <option value="saab">In Testing</option>
                        <option value="saab">Finished</option>
                      </select>
                    <button class="save" type="button">Save</button>
                    <button class="refresh" type="button">Refresh</button>
                </div>
            </div>
            <div class="information">
            <br>
            <hr>
                General
                <div class="information-container">
                    <div class="container">
                        <span>Id</span>
                        <input readonly type="text" value="${data?.id ?? '-'}">
                    </div>
                    <div class="container">
                        <span>Name</span>
                        <input readonly type="text" value="${data?.name ?? '-'}">
                    </div>
                    <div class="container">
                        <span>Story points</span>
                        <input readonly type="text" value="${data?.storyPoints ?? '-'}">
                    </div>
                </div>
                <div class="information-container">
                    <div class="container">
                        <span>Owner</span>
                        <input readonly type="text" value="${data?.owner?.fullName ?? '-'}">
                    </div>
                    <div class="container">
                        <span>Author</span>
                        <input readonly type="text" value="${data?.author?.fullName ?? '-'}">
                    </div>
                    <div class="container">
                        <span>Detected by</span>
                        <input readonly type="text" value="${data?.detectedBy?.fullName ?? '-'}">
                    </div>
                </div>
                <br>
                <hr>
                Description
                <div class="information-container">
                    <div class="container">
                        <input class="description" readonly type="text" value="${''}">
                    </div>
                </div>
                <br>
                <hr>
                Comments
                <div class="information-container">
                    <div class="comments-container">
                        <input type="text" value="${''}">
                        <button class="comments" type="button">Comment</button>
                    </div>
                </div>
            </div>
        </body>

    `;
}


import * as vscode from 'vscode';
import * as Octane from '@microfocus/alm-octane-js-rest-sdk';
import { MyWorkItem } from './my-work-provider';
import { OctaneEntity, OctaneService } from './octane-service';
import { count } from 'console';

export class OctaneWebview {

    public static myWorkScheme = 'alm-octane-entity';

    constructor(
        protected octaneService: OctaneService
    ) {
        this.octaneService = OctaneService.getInstance();
    }

    public static register(context: vscode.ExtensionContext) {
        return vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.details',
            async (node: MyWorkItem) => {
                const data = node.entity;
                if (!data || !data.subtype) {
                    return;
                }

                const panel = vscode.window.createWebviewPanel(
                    'myEditor',
                    data?.id ?? '',
                    vscode.ViewColumn.One,
                    {}
                );

                const fields = await OctaneService.getInstance().getFieldsForType(data.subtype);
                if (!fields) {
                    return;
                }
                const fullData = await OctaneService.getInstance().getDataFromOctaneForTypeAndId(data.subtype, data.id);
                console.log('testing =====');
                console.log(fullData);
                panel.webview.html = getHtmlForWebview(panel.webview, context, fullData, fields);
            });
    }

}

function getDataForSubtype(entity: OctaneEntity | undefined): [string, string] {
    if (entity?.subtype) {
        if (entity?.subtype === 'defect') { return ["D", "#b21646"]; }
        if (entity?.subtype === 'story') { return ["US", "#ffb000"]; }
        if (entity?.subtype === 'quality_story') { return ["QS", "#33c180"]; }
        if (entity?.subtype === 'feature') { return ["F", "#e57828"]; }
        if (entity?.subtype === 'scenario_test') { return ["BSC", "#75da4d"]; }
        if (entity?.subtype === 'test_manual') { return ["MT", "#00abf3"]; }
        if (entity?.subtype === 'auto_test') { return ["AT", "#9b1e83"]; }
        if (entity?.subtype === 'gherkin_test') { return ["GT", "#00a989"]; }
        if (entity?.subtype === 'test_suite') { return ["TS", "#271782"]; }
    }
    return ['', ''];
}

function getHtmlForWebview(webview: vscode.Webview, context: any, data: any | OctaneEntity | undefined, fields: any[]): string {
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
                ${generateElement(data, fields)}
                <br>
                <hr>
                Comments
                <div class="information-container">
                    <div class="comments-container">
                        <input type="text" value="${''}">
                        <button class="comments" type="button">Comment</button>
                    </div>
                </div>
                <br>
            </div>
        </body>

    `;

    // return `
    //     <!DOCTYPE html>
    //     <head>
    //         <link href="${styleVSCodeUri}" rel="stylesheet" />
    //         <link href="${myStyle}" rel="stylesheet" />
    //     </head>
    //     <body>
    //         <div class="top-container">
    //             <div class="icon-container" style="background-color: ${getDataForSubtype(data)[1]}">
    //                 <span class="label">${getDataForSubtype(data)[0]}</span>
    //             </div>
    //             <div class="name-container">
    //                 <h3>${data?.name ?? '-'}</h3>
    //             </div>
    //             <div class="action-container">
    //                 <select name="action" class="action">
    //                     <option value="saab">In progress</option>
    //                     <option value="saab">In Testing</option>
    //                     <option value="saab">Finished</option>
    //                   </select>
    //                 <button class="save" type="button">Save</button>
    //                 <button class="refresh" type="button">Refresh</button>
    //             </div>
    //         </div>
    //         <div class="information">
    //         <br>
    //         <hr>
    //             General
    //             ${generateElement(data, fields)}
    //             <div class="information-container">
    //                 <div class="container">
    //                     <span>Owner</span>
    //                     <input readonly type="text" value="${data?.owner?.fullName ?? '-'}">
    //                 </div>
    //                 <div class="container">
    //                     <span>Author</span>
    //                     <input readonly type="text" value="${data?.author?.fullName ?? '-'}">
    //                 </div>
    //                 <div class="container">
    //                     <span>Detected by</span>
    //                     <input readonly type="text" value="${data?.detectedBy?.fullName ?? '-'}">
    //                 </div>
    //             </div>
    //             <br>
    //             <hr>
    //             Description
    //             <div class="information-container">
    //                 <div class="container">
    //                     <input class="description" readonly type="text" value="${''}">
    //                 </div>
    //             </div>
    //             <br>
    //             <hr>
    //             Comments
    //             <div class="information-container">
    //                 <div class="comments-container">
    //                     <input type="text" value="${''}">
    //                     <button class="comments" type="button">Comment</button>
    //                 </div>
    //             </div>
    //         </div>
    //     </body>

    // `;
}

function generateElement(data: any | OctaneEntity | undefined, fields: any[]): string {
    console.log("data   === ", data);
    console.log("fields === ", fields);

    let html: string = ``;
    let counter: number = 0;

    fields.forEach((field: any) => {
        if(counter == 0) {
            html += `<div class="information-container">`
        }
        const element = `
            <div class="container">
                <span>${field.label}</span>
                <input readonly type="${field.field_type}" value="${data[field.name] ?? '-'}">
            </div>
        `;
        html += element;
        if(counter == 2) {
            html += `</div>`
        }
        counter = counter == 2 ? 0 : counter+1;
    });

    return html;

}


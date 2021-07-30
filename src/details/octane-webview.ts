import * as vscode from 'vscode';
import { MyWorkItem, MyWorkProvider } from '../treeview/my-work-provider';
import { OctaneService } from '../octane/service/octane-service';
import { Transition } from "../octane/model/transition";
import { OctaneEntity } from "../octane/model/octane-entity";
import { stripHtml } from 'string-strip-html';

export class OctaneWebview {

    public static myWorkScheme = 'alm-octane-entity';

    public static fullData: any;

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
                    {
                        enableScripts: true
                    }
                );
                panel.iconPath = MyWorkProvider.getIconForEntity(data);
                const fields = await OctaneService.getInstance().getFieldsForType(data.subtype);
                if (!fields) {
                    return;
                }
                this.fullData = await OctaneService.getInstance().getDataFromOctaneForTypeAndId(data.type, data.subtype, data.id);
                panel.webview.html = getHtmlForWebview(panel.webview, context, this.fullData, fields);
                panel.webview.onDidReceiveMessage(m => {
                    // console.log("from js ---- > ", m);
                    if (m.type === 'get') {
                        panel.webview.postMessage({
                            type: 'post',
                            from: 'webview',
                            data: fields
                        });
                    }
                    if (m.type === 'update') {
                        OctaneService.getInstance().updateEntity(data.type, data.subtype, m.data);
                    }
                });
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
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
        context.extensionUri, 'src/details', 'edit-service.js'));

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
                <div class="name-container">
                    <h3>|  Move to</h3>
                </div>
                <div class="action-container">
                    ${generatePhaseSelectElement(data, fields)}
                    <script src="${scriptUri}"></script>
                </div>
            </div>
            <div class="element">
                <div class="information">
                    ${generateBodyElement(data, fields)}
                </div>
                <div class="comments-sidebar">
                    ${generateCommentElement(data, fields)}
                </div>
            </div>
        </body>

    `;
}

function generatePhaseSelectElement(data: any | OctaneEntity | undefined, fields: any[]): string {
    let html: string = ``;
    let transitions: Transition[] = OctaneService.getInstance().getPhaseTransitionForEntity(data.phase.id);
    html += `<select name="action" class="action" id="selectId">`;
    html += `
            <option>${getFieldValue(data, 'phase')}</option>
        `;
    transitions.forEach((target: any) => {
        if (!target) { return; }
        html += `
            <option>${target.targetPhase.name}</option>
        `;
    });
    html += `</select>
            <button id="saveId" class="save" type="button">Save</button>
            <button class="refresh" type="button">Refresh</button>`;
    return html;
}

function generateCommentElement(data: any | OctaneEntity | undefined, fields: any[]): string {
    let html: string = ``;
    html += `   <br>
                <hr>
                Comments
                <div class="information-container">
                    <div class="comments-container">
                        <input type="text" value="${''}">
                        <button class="comments" type="button">Comment</button>
                    </div>
                </div>
                <br>`;
    return html;
}

function generateBodyElement(data: any | OctaneEntity | undefined, fields: any[]): string {
    let html: string = ``;
    let counter: number = 0;
    const columnCount: number = 2;
    let mainFields: string[] = ['id', 'name', 'phase'];
    let mapFields = new Map<string, any>();
    fields.forEach((field): any => {
        mapFields.set(field.name, field);
    });
    html += `
                <br>
                <hr>
                General
                <div class="information-container">
        `;
    mainFields.forEach((key): any => {
        const field = mapFields.get(key);
        if (!field) { return; }
        html += `
                <div class="container">
                    <span>${field.label}</span>
                    <input id="${field.label}" type="${field.field_type}" value="${getFieldValue(data, field.name)}">
                </div>
                <script>
                        document.getElementById("${field.label}").readOnly = !${field.editable};
                </script>
                `;
    });
    html += `   </div>
                <br>
                <hr>
                Description
                <div class="information-container">
                    <div class="container">
                        <textarea id="Description" class="description" type="text">${stripHtml(getFieldValue(data, 'description').toString()).result}</textarea>
                    </div>
                    <script>
                        document.getElementById("Description").readOnly = !false;
                    </script>
                </div>
                <br>
                <hr>
    `;
    mapFields.forEach((field, key) => {
        if (!['description', ...mainFields].includes(key)) {
            if (counter === 0) {
                html += `<div class="information-container">`;
            }

            if (field.field_type === 'reference') {
                html += `
                <div class="container">
                    <span>${field.label}</span>
                    <textarea id="${field.label}" rows="2" style="resize: none"}">${getFieldValue(data, field.name)}</textarea>
                    <script>
                        document.getElementById("${field.label}").readOnly = !${field.editable};
                    </script>
                </div>
            `;
            } else {
                html += `
                <div class="container">
                    <span>${field.label}</span>
                    <input id="${field.label}" type="${field.field_type}" value="${getFieldValue(data, field.name)}">
                    <script>
                        document.getElementById("${field.label}").readOnly = !${field.editable};
                    </script>
                </div>
            `;
            }
            if (counter === columnCount) {
                html += `</div>`;
            }
            counter = counter === columnCount ? 0 : counter + 1;
        }
    });
    return html;
}

function getFieldValue(data: any, fieldName: string): String | string[] {
    const field = data[fieldName];
    if (!field) {
        return '-';
    }
    if (field['data']) {
        const ref: string[] = [];
        field['data'].forEach((r: any) => {
            ref.push(' ' + r.name);
        });
        return ref.length ? ref : '-';
    }
    if (field['name']) {
        return field['name'];
    }
    if (field['full_name']) {
        return field['full_name'];
    }
    return field;
}
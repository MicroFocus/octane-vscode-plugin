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
                console.log("fullData", this.fullData);
                panel.webview.html = await getHtmlForWebview(panel.webview, context, this.fullData, fields);
                panel.webview.onDidReceiveMessage(m => {
                    // console.log("from js ---- > ", m);
                    if (m.type === 'get') {
                        panel.webview.postMessage({
                            type: 'post',
                            from: 'webview',
                            data: {
                                fields: fields,
                                fullData: this.fullData
                            }
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

async function getHtmlForWebview(webview: vscode.Webview, context: any, data: any | OctaneEntity | undefined, fields: any[]): Promise<string> {
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
                </div>
            </div>
            <div class="element">
                <div class="information">
                    ${await generateBodyElement(data, fields)}
                </div>
                <div class="comments-sidebar">
                    ${generateCommentElement(data, fields)}
                </div>
            </div>
            <script src="${scriptUri}"></script>
        </body>

    `;
}

function generatePhaseSelectElement(data: any | OctaneEntity | undefined, fields: any[]): string {
    let html: string = ``;
    let transitions: Transition[] = OctaneService.getInstance().getPhaseTransitionForEntity(data.phase.id);
    html += `<select name="action" class="action">`;
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
            <button class="refresh" type="button">Refresh</button>
            <button id="filterId" type="button">Filter</button>`;
    return html;
}

function generateCommentElement(data: any | OctaneEntity | undefined, fields: any[]): string {
    let html: string = ``;
    html += `   <br>
                
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

async function generateBodyElement(data: any | OctaneEntity | undefined, fields: any[]): Promise<string> {
    let html: string = ``;
    let counter: number = 0;
    const columnCount: number = 2;
    let filteredFields: string[] = ['id', 'name', 'phase', 'description'];
    let mainFields: string[] = ['id', 'name', 'phase'];
    let mapFields = new Map<string, any>();
    fields.forEach((field): any => {
        mapFields.set(field.name, field);
    });
    html += `
                <br id="filterbr">
                <hr id="filterhr">
                <span id="filtertext">Select fields for this entity type</span>
                <div id="filterContainer">
                    <div id="filterContainerLeft">
                        <button id="allId" type="button">All</button>
                        <button id="noneId" type="button">None</button>
                        <button id="resetId" type="button">Reset</button>
                    </div>
                    <div id="filterContainerRight">
                        
                    
        `;
    for (const [key, field] of mapFields) {
        if (filteredFields.includes(field.name)) {
            html += `           <div class="checkboxDiv"><input checked type="checkbox" class="filterCheckbox" name="${field.label}"><span class="filterCheckboxLabel">${field.label}</span></div>`;
        } else {
            html += `           <div class="checkboxDiv"><input type="checkbox" class="filterCheckbox" name="${field.label}"><span class="filterCheckboxLabel">${field.label}</span></div>`;
        }
    }
    html += `       </div>
                </div>`;

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
                <div class="main-container" id="container_${field.label}">
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
                    <div class="description-container" id="container_Description">
                        <textarea id="Description" class="description" type="text">${stripHtml(getFieldValue(data, 'description').toString()).result}</textarea>
                    </div>
                    <script>
                        document.getElementById("Description").readOnly = !false;
                    </script>
                </div>
                <br>
                <hr>
    `;
    for (const [key, field] of mapFields) {
        if (!['description', ...mainFields].includes(key)) {
            if (counter === 0) {
                html += `<div class="information-container">`;
            }
            if (field.field_type === 'reference') {
                if (field.field_type_data.multiple) {
                    html += `
                    <div class="select-container" id="container_${field.label}">
                        
                        <span>${field.label}</span>
                        <select class="reference-select">
                    `;
                    html += `<option value="none" selected disabled hidden>${getFieldValue(data, field.name)}</option>`;
                    //TO DO: implementation of multiple select
                    // html += `
                    //     </select>
                    // `;
                    // html += `
                    //     <div id="checkboxes">
                    // `;
                    // let mockData = ['alma', 'korte', 'cukor', 'liszt'];
                    // mockData.forEach(x => {
                    //     html += `
                    //         <label for="${x}">
                    //             <input type="checkbox" id="${x}"/>
                    //             "${x}"
                    //         </label>
                    //     `;
                    // });
                    // html += `
                    //     </div>

                    //     </div>
                    // `;
                    //--------------------------------------------
                    html += `
                        </select>
                    </div>
                    `;

                } else {
                    if (field.editable) {
                        html += `
                        <div class="select-container" id="container_${field.label}">
                            <span>${field.label}</span>
                            <select class="reference-select">
                        `;
                        html += `<option value="none" selected disabled hidden>${getFieldValue(data, field.name)}</option>`;
                        if (field.field_type_data.targets[0].type) {
                            let options = await OctaneService.getInstance().getFullDataForEntity(field.field_type_data.targets[0].type, field);
                            options.data.forEach((option: any) => {
                                if (option.type === 'workspace_user') {
                                    html += `<option value="${option}">${option.full_name}</option>`;
                                } else {
                                    html += `<option value="${option}">${option.name}</option>`;
                                }
                            });
                        }
                        html += `
                            </select>
                        </div>`;
                    } else {
                        html += `
                            <div class="container" id="container_${field.label}">
                                <span>${field.label}</span>
                                <input id="${field.label}" type="${field.field_type}" value="${getFieldValue(data, field.name)}">
                                <script>
                                    document.getElementById("${field.label}").readOnly = !${field.editable};
                                </script>
                            </div>
                        `;
                    }
                }
            } else {
                html += `
                <div class="container" id="container_${field.label}">
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
    };
    return html;
}

function getFieldValue(data: any, fieldName: string): string | any[] {
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

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

        <!-- Compiled and minified CSS -->
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css">
            <!-- Compiled and minified JavaScript -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js"></script>
            <link href="${styleVSCodeUri}" rel="stylesheet" />
            <link href="${myStyle}" rel="stylesheet" />
        </head>
        <body>
            <div class="top-container">
                <div class="icon-container" style="background-color: ${getDataForSubtype(data)[1]}">
                <span class="label">${getDataForSubtype(data)[0]}</span>
                </div>
                <div class="name-container">
                    <h6>${data?.name ?? '-'}</h6>
                </div>
                <div class="name-container">
                    <h6>|  Move to</h6>
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
    html += `<select id="select_phase" name="action" class="action">`;
    html += `
            <option value="none">${getFieldValue(data, 'phase')}</option>
        `;
    transitions.forEach((target: any) => {
        if (!target) { return; }
        html += `
            <option value='${JSON.stringify(target.targetPhase)}'>${target.targetPhase.name}</option>
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
    let filteredFields: string[] = ['id', 'name', 'description'];
    let mainFields: string[] = ['id', 'name'];
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
            html += `           <div class="checkboxDiv">
                                    <label>
                                        <input checked type="checkbox" class="filterCheckbox" name="${field.label.replaceAll(" ", "_")}">
                                        <span class="filterCheckboxLabel">${field.label}</span>    
                                    </label>
                                </div>`;
        } else {
            html += `           <div class="checkboxDiv">
                                    <label>
                                        <input type="checkbox" class="filterCheckbox" name="${field.label.replaceAll(" ", "_")}">
                                        <span class="filterCheckboxLabel">${field.label}</span>
                                    </label>
                                </div>`;
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
                <div class="main-container input-field col s6" id="container_${field.label}">
                    <label class="active">${field.label}</label>
                    <input id="${field.name}" type="${field.field_type}" value="${getFieldValue(data, field.name)}">
                </div>
                <script>
                        document.getElementById("${field.name}").readOnly = !${field.editable};
                </script>
                `;
    });
    const phaseField = mapFields.get('phase');
    if (phaseField) {
        html += `
                <div class="main-container input-field col s6" id="container_${phaseField.label}">
                    <label class="active">${phaseField.label}</label>
                    <input id="${phaseField.name}" type="${phaseField.field_type}" value="${getFieldValue(data, phaseField.name)}">
                </div>
                <script>
                        document.getElementById("${phaseField.name}").readOnly = !false;
                </script>
            `;
    }
    html += `   </div>
                <br>
                <hr>
                Description
                <div class="information-container">
                    <div class="description-container" id="container_Description">
                        <textarea id="description" class="description" type="text">${stripHtml(getFieldValue(data, 'description').toString()).result}</textarea>
                    </div>
                    <script>
                        document.getElementById("description").readOnly = !false;
                    </script>
                </div>
                <br>
                <hr>
    `;
    for (const [key, field] of mapFields) {
        if (!['description', 'phase', ...mainFields].includes(key)) {
            if (counter === 0) {
                html += `<div class="information-container">`;
            }
            if (field.field_type === 'reference') {
                if (field.field_type_data.multiple) {
                    html += `
                    <div class="select-container" id="container_${field.label.replaceAll(" ", "_")}">
                        <label>${field.label}</label>
                        <select class="reference-select" multiple="multiple">
                    `;
                    let selected = getFieldValue(data, field.name);
                    let options = await OctaneService.getInstance().getFullDataForEntity(field.field_type_data.targets[0].type, field);
                    console.log("----------->>>", options);
                    if (options) {
                        options.data.forEach((option: any) => {
                            if (selected.includes(option.name)) {
                                html += `<option selected value='${JSON.stringify(option)}'>${option.name}</option>`;
                            } else {
                                html += `<option value='${JSON.stringify(option)}'>${option.name}</option>`;
                            }
                        });
                    }
                    html += `
                        </select>
                        
                    </div>
                    `;
                } else {
                    if (field.editable) {
                        html += `
                        <div class="select-container" id="container_${field.label.replaceAll(" ", "_")}">
                            <label>${field.label}</label>
                            <select class="reference-select" id="${field.name}">
                        `;
                        html += `<option value="none" selected disabled hidden>${getFieldValue(data, field.name)}</option>`;
                        if (field.field_type_data.targets[0].type) {
                            let options = await OctaneService.getInstance().getFullDataForEntity(field.field_type_data.targets[0].type, field);
                            options.data.forEach((option: any) => {
                                if (option.type === 'workspace_user') {
                                    html += `<option value='${JSON.stringify(option)}'>${option.full_name}</option>`;
                                } else {
                                    html += `<option value='${JSON.stringify(option)}'>${option.name}</option>`;
                                }
                            });
                        }
                        html += `
                            </select>
                        </div>`;
                    } else {
                        html += `
                            <div class="input-field col s6 container" id="container_${field.label.replaceAll(" ", "_")}">
                                <label class="active" for="${field.label}">${field.label}</label>
                                <input style="border: 0.5px solid; border-color: var(--vscode-dropdown-border); margin-top: 1.55rem;" id="${field.name}" type="${field.field_type}" value="${getFieldValue(data, field.name)}">
                                <script>
                                    document.getElementById("${field.name}").readOnly = !${field.editable};
                                </script>
                            </div>
                        `;
                    }
                }
            } else {
                html += `
                <div class="input-field col s6 container" id="container_${field.label.replaceAll(" ", "_")}">
                    <label class="active" for="${field.label}">${field.label}</label>
                    <input style="border: 0.5px solid; border-color: var(--vscode-dropdown-border); margin-top: 1.55rem;" id="${field.name}" type="${field.field_type}" value="${getFieldValue(data, field.name)}">
                    <script>
                        document.getElementById("${field.name}").readOnly = !${field.editable};
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
            ref.push(r.name);
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

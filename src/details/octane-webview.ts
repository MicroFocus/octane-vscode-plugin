import * as vscode from 'vscode';
import { MyWorkItem, MyWorkProvider } from '../treeview/my-work-provider';
import { OctaneService } from '../octane/service/octane-service';
import { Transition } from "../octane/model/transition";
import { OctaneEntity } from "../octane/model/octane-entity";
import { stripHtml } from 'string-strip-html';
import { OctaneEntityHolder } from '../octane/model/octane-entity-holder';

export class OctaneWebview {

    public static myWorkScheme = 'alm-octane-entity';

    public static fullData: any;

    static emitter = new vscode.EventEmitter<string>();
    static onDidFilterChange: vscode.Event<string> = OctaneWebview.emitter.event;

    constructor(
        protected octaneService: OctaneService
    ) {
        this.octaneService = OctaneService.getInstance();
    }

    public static register(context: vscode.ExtensionContext) {
        let self = this;
        return vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.details',
            async (node: OctaneEntityHolder) => {
                const data = node.entity;
                if (!data) {
                    return;
                }

                const typeForBuild = data.subtype === '' ? data.type : data.subtype;
                if (!typeForBuild) {
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
                const fields = await OctaneService.getInstance().getFieldsForType(typeForBuild);
                if (!fields) {
                    return;
                }
                this.fullData = await OctaneService.getInstance().getDataFromOctaneForTypeAndId(data.type, data.subtype, data.id);
                console.log("fullData", this.fullData);
                panel.webview.html = await getHtmlForWebview(panel.webview, context, this.fullData, fields);
                let eventhandler = self.onDidFilterChange(async e => panel.webview.html = await getHtmlForWebview(panel.webview, context, this.fullData, fields));
                panel.onDidDispose(e => eventhandler.dispose());
                panel.webview.onDidReceiveMessage(async m => {
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
                    if (m.type === 'refresh') {
                        this.fullData = await OctaneService.getInstance().getDataFromOctaneForTypeAndId(data.type, data.subtype, data.id);
                        panel.webview.html = await getHtmlForWebview(panel.webview, context, this.fullData, fields);
                    }
                    if (m.type === 'post-comment') {
                        let commentData = m.data;
                        commentData.owner_work_item = {
                            'id': data.id ?? '',
                            'type': data.type ?? '',
                            'subtype': data.subtype ?? '',
                            'name': data.name ?? ''
                        };
                        OctaneService.getInstance().postCommentForEntity(commentData);
                        this.fullData = await OctaneService.getInstance().getDataFromOctaneForTypeAndId(data.type, data.subtype, data.id);
                        panel.webview.html = await getHtmlForWebview(panel.webview, context, this.fullData, fields);
                    }
                    if (m.type === 'saveToMemento') {
                        self.emitter.fire('test');
                        // vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshWebviewPanel');
                        vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFilterSelection', m.data);
                    }
                    if (m.type = 'add-to-mywork') {
                        await OctaneService.getInstance().addToMyWork(data);
                        vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');
                    }
                });
            });
    }

}

function getDataForSubtype(entity: OctaneEntity | undefined): [string, string] {
    if (entity?.type === 'task') {return ['T', '#1668c1'];}
    if (entity?.type === 'comment') {return ['C', '#ffff56'];}
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
        if (entity?.subtype === 'requirement_document') { return ["RD", "#0b8eac"]; }
        if (entity?.subtype === 'run_suite') { return ["SR", "#5414ac"]; }
    }
    return ['', ''];
}

async function getHtmlForWebview(webview: vscode.Webview, context: any, data: any | OctaneEntity | undefined, fields: any[]): Promise<string> {
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
        context.extensionUri, 'media', 'vscode.css'));
    const myStyle = webview.asWebviewUri(vscode.Uri.joinPath(
        context.extensionUri, 'media', 'my-css.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
        context.extensionUri, 'media', 'edit-service.js'));

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
                    <h6>${data?.id ?? '-'}</h6>
                </div>
                <div class="name-container">
                    <h6>${data?.name ?? '-'}</h6>
                </div>
                <div class="name-container">
                    Current phase: ${getFieldValue(data.phase, 'name')}
                </div>
                <div class="name-container">
                    <h6> |  Move to</h6>
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
                    ${await generateCommentElement(data, fields)}
                </div>
            </div>
            <script src="${scriptUri}"></script>
        </body>

    `;
}

function generatePhaseSelectElement(data: any | OctaneEntity | undefined, fields: any[]): string {
    let html: string = ``;
    if (data.phase) {
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
    }
    html += `</select>
                <button id="saveId" class="save" type="button">Save</button>
                <button id="refresh" type="button">Refresh</button>
                <button id="addToMyWork" type="button">Add to MyWork</button>
                <button id="filterId" type="button">Filter</button>`;
    return html;
}

async function generateCommentElement(data: any | OctaneEntity | undefined, fields: any[]): Promise<string> {
    let html: string = ``;
    html += `   <br>
                
                Comments
                <div class="information-container">
                    <div class="comments-container">
                        <input id="comments-text" type="text">
                        <button id="comments" type="button">Comment</button>
                    </div>
                </div>
                <br>`;
    let comments = await OctaneService.getInstance().getCommentsForEntity(data.id);
    console.log("comments", comments);
    if (comments) {
        for (const comment of comments) {
            html += `
                <div class="information-container">
                    ${comment.author?.fullName ?? ''}: <input type="text" value="${stripHtml(comment.text).result}">
                </div>
            `;
        }
    }

    return html;
}

async function isSelectedField(fieldName: string) {
    if (fieldName) {
        let resFilterSelection = await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.getFilterSelection', fieldName);
        return resFilterSelection;
    }
    return false;
}

async function generateBodyElement(data: any | OctaneEntity | undefined, fields: any[]): Promise<string> {
    let html: string = ``;
    let counter: number = 0;
    const columnCount: number = 2;
    let filteredFields: string[] = [];
    let mainFields: string[] = ['name'];
    let mapFields = new Map<string, any>();
    fields.forEach((field): any => {
        if(field.name !== 'id') {
            mapFields.set(field.name, field);
        }
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
    // ['ID', 'Name', 'Description'].forEach(f => {
    //     vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFilterSelection', JSON.parse(`{"filterName": "${f}", "message": true}`));
    // });
    for (const [key, field] of mapFields) {
        // console.log('key = ',key, 'field=',field);
        if (await isSelectedField(field.label.replaceAll(" ", "_"))) {
            filteredFields = filteredFields.concat(field.name);
        } else {
            filteredFields = filteredFields.filter(f => f !== field.name);
        }
        if (filteredFields.includes(field.name)) {
            html += `           <div class="checkboxDiv">
                                    <label>
                                        <input checked type="checkbox" class="filterCheckbox" name='${field.label.replaceAll(" ", "_")}'>
                                        <span class="filterCheckboxLabel">${field.label}</span>    
                                    </label>
                                </div>`;
        } else {
            html += `           <div class="checkboxDiv">
                                    <label>
                                        <input type="checkbox" class="filterCheckbox" name='${field.label.replaceAll(" ", "_")}'>
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
    mainFields.forEach(async (key): Promise<any> => {
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
        if (!await isSelectedField(field.label.replaceAll(" ", "_"))) {
            html += `
                    <script>
                        document.getElementById("container_${field.label.replaceAll(" ", "_")}").style.display = "none";
                    </script>
                `;
        }
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
        if (!await isSelectedField(phaseField.label.replaceAll(" ", "_"))) {
            html += `
                <script>
                    document.getElementById("container_${phaseField.label.replaceAll(" ", "_")}").style.display = "none";
                </script>
            `;
        }
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
    if (!await isSelectedField("Description")) {
        html += `
            <script>
                document.getElementById("container_Description").style.display = "none";
            </script>
        `;
    }
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
                        <select class="reference-select" multiple="multiple" id="${field.name}">
                    `;
                    let selected = getFieldValue(data, fieldNameMap.get(field.name) ?? field.name);
                    let options = await OctaneService.getInstance().getFullDataForEntity(field.field_type_data.targets[0].type, field, data);
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
                            let options = await OctaneService.getInstance().getFullDataForEntity(field.field_type_data.targets[0].type, field, data);
                            if (options) {
                                options.data.forEach((option: any) => {
                                    if (option) {
                                        if (option.type === 'workspace_user') {
                                            html += `<option value='${JSON.stringify(option)}'>${option.full_name}</option>`;
                                        } else {
                                            html += `<option value='${JSON.stringify(option)}'>${option.name}</option>`;
                                        }
                                    }
                                });
                            }
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
        if (filteredFields.includes(field.name)) {
            html += `
                <script>
                    document.getElementById("container_${field.label.replaceAll(" ", "_")}").style.display = "flex";
                </script>
            `;
        }
    }
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

const fieldNameMap: Map<String, String> = new Map([
    ['application_module', 'product_areas']
]);
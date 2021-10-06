import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { MyWorkProvider } from '../treeview/my-work-provider';
import { OctaneEntity } from '../octane/model/octane-entity';
import { Transition } from '../octane/model/transition';
import { stripHtml } from 'string-strip-html';
import * as path from 'path';

class OctaneEntityDocument implements vscode.CustomDocument {

    static async create(
        uri: vscode.Uri
    ): Promise<OctaneEntityDocument> {
        let pathComponents = uri.path.split('/');
        let type: string = pathComponents[2];
        let subType: string = pathComponents[3];
        let id: string = pathComponents[4];

        const typeForBuild = subType === '' ? type : subType;
        if (!typeForBuild) {
            throw new Error('Entity with no type or subtype.');
        }
        const fields = await OctaneService.getInstance().getFieldsForType(typeForBuild);
        if (!fields) {
            throw new Error('No fields for entity.');
        }
        const fullData = await OctaneService.getInstance().getDataFromOctaneForTypeAndId(type, subType, id);
        return new OctaneEntityDocument(uri, fields, fullData);
    }

    public readonly uri: vscode.Uri;
    public readonly fields: any;
    public entity: any;

    private constructor(
        uri: vscode.Uri,
        fields: any,
        entity: any
    ) {
        this.uri = uri;
        this.fields = fields;
        this.entity = entity;
    }

    dispose(): void {
    }

}

export class OctaneEntityEditorProvider implements vscode.CustomReadonlyEditorProvider<OctaneEntityDocument> {

    public static readonly viewType = 'visual-studio-code-plugin-for-alm-octane.octane';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {

        return vscode.window.registerCustomEditorProvider(
            OctaneEntityEditorProvider.viewType,
            new OctaneEntityEditorProvider(context),
            {
                webviewOptions: {
                    retainContextWhenHidden: false,
                },
                supportsMultipleEditorsPerDocument: false
            });
    }

    constructor(
        private readonly context: vscode.ExtensionContext
    ) {
        this.onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<OctaneEntityDocument>>().event;
    }

    onDidChangeCustomDocument: vscode.Event<vscode.CustomDocumentEditEvent<OctaneEntityDocument>> | vscode.Event<vscode.CustomDocumentContentChangeEvent<OctaneEntityDocument>>;

    static emitter = new vscode.EventEmitter<string>();
    static onDidFilterChange: vscode.Event<string> = OctaneEntityEditorProvider.emitter.event;

    async openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): Promise<OctaneEntityDocument> {
        console.info('openCustomDocument called', uri, openContext);
        const document: OctaneEntityDocument = await OctaneEntityDocument.create(uri);
        return document;
    }

    async resolveCustomEditor(document: OctaneEntityDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
        console.info('resolveCustomEditor called', document, webviewPanel);

        // webviewPanel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, `media/treeIcons/${getDataForSubtype(document.entity)[0]}.svg`);
        webviewPanel.iconPath = vscode.Uri.file(path.join(this.context.extensionPath, `media/treeIcons/${getDataForSubtype(document.entity)[0]}.svg`));
        webviewPanel.title = 'Testing title';
        console.info('icon: ', webviewPanel.iconPath.toString());

        webviewPanel.webview.options = {
            enableScripts: true,
        };

        try {
            let self = this;

            webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview, this.context, document.entity, document.fields);

            let eventhandler = OctaneEntityEditorProvider.onDidFilterChange(async e => webviewPanel.webview.html = await self.getHtmlForWebview(webviewPanel.webview, self.context, document.entity, document.fields));
            webviewPanel.onDidDispose(e => eventhandler.dispose());
            webviewPanel.webview.onDidReceiveMessage(async m => {
                if (m.type === 'get') {
                    webviewPanel.webview.postMessage({
                        type: 'post',
                        from: 'webview',
                        data: {
                            fields: document.fields,
                            fullData: document.entity
                        }
                    });
                }
                if (m.type === 'update') {
                    OctaneService.getInstance().updateEntity(document.entity.type, document.entity.subtype, m.data);
                }
                if (m.type === 'refresh') {
                    document.entity = await OctaneService.getInstance().getDataFromOctaneForTypeAndId(document.entity.type, document.entity.subtype, document.entity.id);
                    webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview, this.context, document.entity, document.fields);
                }
                if (m.type === 'post-comment') {
                    let commentData = m.data;
                    commentData.owner_work_item = {
                        'id': document.entity.id ?? '',
                        'type': document.entity.type ?? '',
                        'subtype': document.entity.subtype ?? '',
                        'name': document.entity.name ?? ''
                    };
                    OctaneService.getInstance().postCommentForEntity(commentData);
                    // this.fullData = await OctaneService.getInstance().getDataFromOctaneForTypeAndId(data.type, data.subtype, data.id);
                    webviewPanel.webview.html = await self.getHtmlForWebview(webviewPanel.webview, self.context, document.entity, document.fields);
                }
                if (m.type === 'saveToMemento') {
                    OctaneEntityEditorProvider.emitter.fire('test');
                    // vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshWebviewPanel');
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFilterSelection', m.data);
                }
                if (m.type = 'add-to-mywork') {
                    await OctaneService.getInstance().addToMyWork(document.entity);
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');
                }
            });

        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    private async getHtmlForWebview(webview: vscode.Webview, context: any, data: any | OctaneEntity | undefined, fields: any[]): Promise<string> {
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
                        <h6>${data?.name ?? '-'}</h6>
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
}

function getDataForSubtype(entity: OctaneEntity | undefined): [string, string] {
    if (entity?.type === 'task') {
        return ['T', '#1668c1'];
    }
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
    }
    return ['', ''];
}

function generatePhaseSelectElement(data: any | OctaneEntity | undefined, fields: any[]): string {
    let html: string = ``;
    html += `
            <div>
                <h6 style="margin:1.3rem 0.5rem 0rem 0rem">Current phase: ${getFieldValue(data.phase, 'name')} |  Move to </h6>
            </div>
    `;
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
    let mainFields: string[] = ['id', 'name'];
    let mapFields = new Map<string, any>();
    fields.forEach((field): any => {
        mapFields.set(field.name, field);
    });
    mapFields = new Map([...mapFields].sort((a, b) => String(a[0]).localeCompare(b[0])));
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
    }
    if (!await isSelectedField(phaseField.label.replaceAll(" ", "_"))) {
        html += `
            <script>
                document.getElementById("container_${phaseField.label.replaceAll(" ", "_")}").style.display = "none";
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
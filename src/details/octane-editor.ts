import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { MyWorkProvider } from '../treeview/my-work-provider';
import { OctaneEntity } from '../octane/model/octane-entity';
import { Transition } from '../octane/model/transition';
import { stripHtml } from 'string-strip-html';
import * as path from 'path';
import { getLogger } from 'log4js';

class OctaneEntityDocument implements vscode.CustomDocument {

    private logger = getLogger('vs');

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

    private logger = getLogger('vs');

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
        this.logger.info('openCustomDocument called', uri, openContext);
        const document: OctaneEntityDocument = await OctaneEntityDocument.create(uri);
        return document;
    }

    async resolveCustomEditor(document: OctaneEntityDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
        this.logger.info('resolveCustomEditor called', document, webviewPanel);

        webviewPanel.iconPath = vscode.Uri.file(path.join(this.context.extensionPath, `media/treeIcons/${getDataForSubtype(document.entity)[0]}.svg`));

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
                // if (m.type === 'saveToMemento') {
                //     OctaneEntityEditorProvider.emitter.fire('test');
                //     // vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshWebviewPanel');
                //     vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFilterSelection', m.data);
                // }
                if (m.type === 'saveToMemento') {
                    if (document.entity) {
                        if (document.entity.subtype !== null && document.entity.subtype !== undefined && document.entity.subtype !== "") {
                            vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', m.data, document.entity.subtype);
                            OctaneEntityEditorProvider.emitter.fire('test');
                        } else {
                            if (document.entity.type !== null && document.entity.type !== undefined) {
                                vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', m.data, document.entity.type);
                                OctaneEntityEditorProvider.emitter.fire('test');
                            }
                        }
                    }
                }
                if (m.type === 'add-to-mywork') {
                    await OctaneService.getInstance().addToMyWork(document.entity);
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');
                }
                if (m.type === 'open-in-browser') {
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.openInBrowser', document.entity);
                }
                if (m.type === 'get-data-for-single-select') {
                    if (m.data && m.data.field) {
                        let field = document.fields.filter((f: any) => f.name === m.data.field);
                        if (field) {
                            let data = await generateSelectOptions(field[0], document.entity);
                            if (data) {
                                let selectedField = getFieldValue(document.entity, field[0].name);
                                webviewPanel.webview.postMessage({
                                    type: 'post-options-for-single-select',
                                    from: 'webview',
                                    data: {
                                        field: field,
                                        options: data,
                                        selectedField: selectedField
                                    }
                                });
                            }

                            console.log("data", data);
                        }
                    }

                }
            });

        } catch (e) {
            this.logger.error(e);
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


        var activeFields: string[] | undefined = [];
        if (data.subtype !== null && data.subtype !== undefined && data.subtype !== "") {
            activeFields = await getSavedFields(data.subtype);
        } else {
            if (data.type !== null && data.type !== undefined) {
                activeFields = await getSavedFields(data.type);
            }
        }

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
                        <h6>${data?.id ?? ''} | ${data?.name ?? ''}</h6>
                    </div>
                    <div class="action-container">
                        ${await generatePhaseSelectElement(data, fields, activeFields)}
                    </div>
                </div>
                <div class="main-element">
                    <div id="element-id" class="element">
                        <div class="information">
                            ${await generateBodyElement(data, fields, activeFields)}
                        </div>
                    </div>
                    <div id="comments-element-id" class="comments-element">
                        <div id="comments-sidebar-id" class="comments-sidebar">
                            ${await generateCommentElement(data, fields)}
                        </div>
                    </div>
                </div>
                
                <script src="${scriptUri}"></script>
            </body>
    
        `;
    }
}

async function generateSelectOptions(field: any, data: any | OctaneEntity | undefined) {
    if (field && field.field_type_data && field.field_type_data.targets && data) {
        return await OctaneService.getInstance().getFullDataForEntity(field.field_type_data.targets[0].type, field, data);
    }
    return;
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

async function generatePhaseSelectElement(data: any | OctaneEntity | undefined, fields: any[], activeFields: string[] | undefined): Promise<string> {
    let html: string = ``;
    if (data.phase) {
        html += `
            <div>
                <h6 style="margin:1.3rem 0.5rem 0rem 0rem">Current phase: ${getFieldValue(data.phase, 'name')} |  Move to </h6>
            </div>
        `;
    }
    if (data.phase) {
        let transitions: Transition[] = OctaneService.getInstance().getPhaseTransitionForEntity(data.phase.id);
        html += `<select id="select_phase" name="action" class="action">`;
        // html += `
        //     <option value="none">${getFieldValue(data, 'phase')}</option>
        // `;
        html += `
            <option value="none"></option>
        `;
        transitions.forEach((target: any) => {
            if (!target) { return; }
            html += `
            <option value='${JSON.stringify(target.targetPhase)}'>${target.targetPhase.name}</option>
        `;
        });
    }
    html += `</select>
                <button title="Save" id="saveId" class="save" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM6 6h9v4H6z"/></svg>
                </button>
                <button title="Refresh" id="refresh" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                </button>
                <button title="Open in browser the current entity" id="openInBrowser" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>
                </button>
                <button title="Comments" id="commentsId" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15 4v7H5.17l-.59.59-.58.58V4h11m1-2H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm5 4h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1z"/></svg>
                </button>
                <script>
                            $(document).ready(function() {
                                $('[data-toggle="tooltip"]').tooltip();
                            });
                </script>
            `;

    let filteredFields: string[] = [];
    let mapFields = new Map<string, any>();
    fields.forEach((field): any => {
        if (field.name !== "id") {
            mapFields.set(field.label, field);
        }
    });
    mapFields = new Map([...mapFields].sort((a, b) => String(a[0]).localeCompare(b[0])));
    html += `
            <div style="margin: 0 0 0 0.5rem; width: 20rem;" id="container_filter_multiselect">
                <select class="reference-select" multiple="multiple" id="filter_multiselect">
                <option value="" disabled>Filter</option>
            `;
    for (const [key, field] of mapFields) {

        if (field) {
            if (await isSelectedField(field.label.replaceAll(" ", "_"), activeFields)) {
                filteredFields = filteredFields.concat(field.name);
            } else {
                filteredFields = filteredFields.filter(f => f !== field.name);
            }
            if (filteredFields.includes(field.name)) {
                html += `<option class="filter_option" selected value='${JSON.stringify(field)}'>${field.label}</option>`;
            } else {
                html += `<option class="filter_option" value='${JSON.stringify(field)}'>${field.label}</option>`;
            }
        }
    }
    html += `
                        </select>
                        
                    </div>
                    <button title="Add to MyWork" id="addToMyWork" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    </button>
                    `;
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
    getLogger('vs').info("comments", comments);
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

async function getSavedFields(entityType: string) {
    let res: string[] | undefined = await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.getFields', entityType);
    return res;
}

async function isSelectedField(fieldName: string, activeFields: string[] | undefined) {
    if (fieldName) {
        // let resFilterSelection = await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.getFilterSelection', fieldName);
        if (activeFields && activeFields.includes(fieldName)) {
            return true;
        }
    }
    return false;
}

async function generateBodyElement(data: any | OctaneEntity | undefined, fields: any[], activeFields: string[] | undefined): Promise<string> {
    let html: string = ``;
    let counter: number = 0;
    const columnCount: number = 2;
    let filteredFields: string[] = [];
    let mainFields: string[] = ['name'];
    let mapFields = new Map<string, any>();
    fields.forEach((field): any => {
        if (field.name !== "id") {
            mapFields.set(field.name, field);
        }
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
        if (field) {
            if (await isSelectedField(field.label.replaceAll(" ", "_"), activeFields)) {
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
        if (!await isSelectedField(field.label.replaceAll(" ", "_"), activeFields)) {
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
        if (!await isSelectedField(phaseField.label.replaceAll(" ", "_"), activeFields)) {
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
    if (!await isSelectedField("Description", activeFields)) {
        html += `
            <script>
                document.getElementById("container_Description").style.display = "none";
            </script>
        `;
    }
    for (const [key, field] of mapFields) {
        if (field) {
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
                        <div class="select-container-single" id="container_${field.label.replaceAll(" ", "_")}">
                            <label name="${field.name}">${field.label}</label>
                            <select class="reference-select-single" id="${field.name}">
                        `;
                            html += `<option value="none" selected disabled hidden>${getFieldValue(data, field.name)}</option>`;
                            // if (field.field_type_data.targets[0].type) {
                            //     let options = await OctaneService.getInstance().getFullDataForEntity(field.field_type_data.targets[0].type, field, data);
                            //     if (options) {
                            //         options.data.forEach((option: any) => {
                            //             if (option) {
                            //                 if (option.type === 'workspace_user') {
                            //                     html += `<option value='${JSON.stringify(option)}'>${option.full_name}</option>`;
                            //                 } else {
                            //                     html += `<option value='${JSON.stringify(option)}'>${option.name}</option>`;
                            //                 }
                            //             }
                            //         });
                            //     }
                            // }
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
    }
    html += `</div>`;
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
import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { MyWorkProvider } from '../treeview/my-work-provider';
import { OctaneEntity } from '../octane/model/octane-entity';
import { Transition } from '../octane/model/transition';
import { stripHtml } from 'string-strip-html';
import * as path from 'path';
import { getLogger, Logger } from 'log4js';
import { Comment } from '../octane/model/comment';
import { FieldTemplateFactory } from './field-template-factory';

class OctaneEntityDocument implements vscode.CustomDocument {

    private logger = getLogger('vs');

    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

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

    public constructor(
        uri: vscode.Uri,
        fields: any,
        entity: any
    ) {
        this.uri = uri;
        this.fields = fields;
        this.entity = entity;
    }

    dispose(): void {
        this._onDidChange.dispose();
    }

    async updated(): Promise<void> {
        this.entity = await OctaneService.getInstance().getDataFromOctaneForTypeAndId(this.entity.type, this.entity.subType, this.entity.id);
        this._onDidChange.fire(this.uri);
    }
}

class WebviewCollection {

    private readonly webviews = new Set<{
        readonly resource: string;
        readonly webviewPanel: vscode.WebviewPanel;
    }>();

    /**
     * Get all known webviews for a given uri.
     */
    public *get(uri: vscode.Uri): Iterable<vscode.WebviewPanel> {
        const key = uri.toString();
        for (const entry of this.webviews) {
            if (entry.resource === key) {
                yield entry.webviewPanel;
            }
        }
    }

    /**
     * Add a new webview to the collection.
     */
    public add(uri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
        const entry = { resource: uri.toString(), webviewPanel };
        this.webviews.add(entry);

        webviewPanel.onDidDispose(() => {
            this.webviews.delete(entry);
        });
    }

    public closeAll() {
        this.webviews.forEach(v => v.webviewPanel.dispose());
    }
}

export class OctaneEntityEditorProvider implements vscode.CustomReadonlyEditorProvider<OctaneEntityDocument> {

    private logger = getLogger('vs');

    private webviewPanels = new WebviewCollection();

    public static readonly viewType = 'visual-studio-code-plugin-for-alm-octane.octane';

    public static register(context: vscode.ExtensionContext) {

        context.subscriptions.push(vscode.window.registerCustomEditorProvider(
            OctaneEntityEditorProvider.viewType,
            new OctaneEntityEditorProvider(context),
            {
                webviewOptions: {
                    retainContextWhenHidden: false,
                },
                supportsMultipleEditorsPerDocument: false
            }));
    }

    constructor(
        private readonly context: vscode.ExtensionContext
    ) {
        context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.details.closeAll', () => {
            this.webviewPanels.closeAll();
        }));

        {
            let setFields = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.setFields', async (data, entityType) => {
                if (data.fields) {
                    this.logger.debug(data);
                    await context.workspaceState.update(`visibleFields-${entityType}`,
                        JSON.stringify(data)
                    );
                }
            });
            context.subscriptions.push(setFields);
        }

        {
            let getFields = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.getFields', (entityType) => {
                if (entityType) {
                    let value: any = context.workspaceState.get(`visibleFields-${entityType}`);
                    if (value) {
                        value = JSON.parse(value);
                        if (value && value.fields) {
                            return value.fields;
                        }
                    }
                }
                return;
            });
            context.subscriptions.push(getFields);
        }
    }

    static emitter = new vscode.EventEmitter<string>();
    static onDidFilterChange: vscode.Event<string> = OctaneEntityEditorProvider.emitter.event;

    async openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): Promise<OctaneEntityDocument> {
        this.logger.debug('openCustomDocument called', uri, openContext);
        return new OctaneEntityDocument(uri, undefined, undefined);
    }

    async resolveCustomEditor(document_: OctaneEntityDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
        try {

            let document = await OctaneEntityDocument.create(document_.uri);
            this.logger.debug('resolveCustomEditor called', document, webviewPanel);
            webviewPanel.iconPath = vscode.Uri.file(path.join(this.context.extensionPath, `media/treeIcons/${getDataForSubtype(document.entity)[0]}.svg`));
            webviewPanel.webview.options = {
                enableScripts: true,
            };

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
                    await document.updated();
                    webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview, this.context, document.entity, document.fields);
                    webviewPanel.webview.postMessage({
                        type: 'init',
                        from: 'webview'
                    });
                }
                if (m.type === 'post-comment') {
                    let comment: Comment = new Comment(m.data);
                    comment.ownerEntity = document.entity;
                    OctaneService.getInstance().postCommentForEntity(comment);
                }
                if (m.type === 'saveToMemento') {
                    if (document.entity) {
                        let mementoKey = this.getMementoKeyForFields(document.entity);
                        if (mementoKey && mementoKey !== '') {
                            vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', m.data, mementoKey);
                            OctaneEntityEditorProvider.emitter.fire('test');
                        }
                    }
                }
                if (m.type === 'add-to-mywork') {
                    await OctaneService.getInstance().addToMyWork(document.entity);
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');
                }
                if (m.type === 'open-in-browser') {
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.openInBrowser', { entity: document.entity });
                }
                if (m.type === 'get-data-for-select') {
                    if (m.data && m.data.field) {
                        let field = document.fields.filter((f: any) => f.name === m.data.field);
                        if (field) {
                            let data = await generateSelectOptions(field[0], document.entity);
                            if (data) {
                                let selectedField;
                                if (field[0].field_type_data && field[0].field_type_data.multiple) {
                                    selectedField = getFieldValue(document.entity, fieldNameMap.get(field[0].name) ?? field[0].name);
                                    webviewPanel.webview.postMessage({
                                        type: 'post-options-for-multiple-select',
                                        from: 'webview',
                                        data: {
                                            field: field,
                                            options: data,
                                            selectedList: selectedField
                                        }
                                    });
                                } else {
                                    selectedField = getFieldValue(document.entity, field[0].name);
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
                            }

                        }
                    }

                }
            });

            this.webviewPanels.add(document.uri, webviewPanel);
        } catch (e: any) {
            let errorMessage = `Error occurred while trying to display entity.`;
            if (e && e.statusCode && e.statusCode === 404) {
                let pathComponents = document_.uri.path.split('/');
                let type: string = pathComponents[2];
                let subType: string = pathComponents[3];
                let id: string = pathComponents[4];
                this.logger.error("Error: entity has been deleted.");
                errorMessage = `Error: entity with id "${id}" and type "${subType === '' ? type : subType}" has been deleted.`;
            } else if (e.message) {
                errorMessage = e.message;
            } else {
                this.logger.error(e);
            }
            vscode.window.showErrorMessage(errorMessage);
            webviewPanel.webview.html = errorMessage;
        }


    }

    private getMementoKeyForFields(entity: OctaneEntity) {
        return (entity.subtype && entity.subtype !== '') ? entity.subtype : entity.type;
    }

    /**
    * Generating html code for webview panel
    * @param webview Webview
    * @param context Context for view
    * @param data The current OctaneEntity.
    * @param fields All fields for given OctaneEntity
    * @return html code as string for webview panel
    */
    private async getHtmlForWebview(webview: vscode.Webview, context: any, data: any | OctaneEntity | undefined, fields: any[]): Promise<string> {

        //load default fields at first opening of the given entity
        var activeFields: string[] | undefined = [];
        let mementoKey = this.getMementoKeyForFields(data);
        if (mementoKey && mementoKey !== '') {
            activeFields = await getSavedFields(mementoKey);
            if (activeFields === undefined) {
                saveDefaultFieldsForEntityType(mementoKey);
                activeFields = await getSavedFields(mementoKey);
            }
        }

        //load default fields at reset of the fields in the field selector
        var currentDefaultFields: string[] | undefined = [];
        if (mementoKey && mementoKey !== '') {
            currentDefaultFields = defaultFieldMap.get(mementoKey);
        }
        if (!currentDefaultFields) {
            currentDefaultFields = defaultFieldMap.get('default');
        }

        let mapFields = new Map<string, any>();
        fields.forEach((field): any => {
            mapFields.set(field.label, field);
        });

        return `
            <!DOCTYPE html>
            <head>
                <!-- Include Twitter Bootstrap and jQuery: -->
                <link rel="stylesheet" href="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'bootstrap.min.css'))}" type="text/css"/>
                <link rel="stylesheet" href="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'font-awesome.css'))}" type="text/css"/>
                <script type="text/javascript" src="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'jquery.min.js'))}"></script>
                <script type="text/javascript" src="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'moment.min.js'))}"></script>
                <script type="text/javascript" src="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'bootstrap.bundle.min.js'))}"></script>
                <script type="text/javascript" src="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'bootstrap-datetimepicker.min.js'))}"></script>
                
                <!-- Include the plugin's CSS and JS: -->
                <script type="text/javascript" src="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'bootstrap-multiselect.min.js'))}"></script>
                <link rel="stylesheet" href="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'bootstrap-multiselect.min.css'))}" type="text/css"/>
                <link rel="stylesheet" href="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'bootstrap-datetimepicker.css'))}" type="text/css"/>
                <link href="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'vscode.css'))}" rel="stylesheet" />
                <link href="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'my-css.css'))}" rel="stylesheet" />
            </head>
            <body>
                <form id="mainform">
                <div class="top-container">
                    <div class="icon-container" style="background-color: ${getDataForSubtype(data)[1]}">
                        <span class="label">${getDataForSubtype(data)[0]}</span>
                    </div>
                    <h6 style="margin: 2.8rem 0rem 0rem 0.5rem;">${data?.id ?? ''}</h6>
                    ${FieldTemplateFactory.getTemplate(mapFields.get('Name'), data).generate()}
                    <div class="action-container">
                        ${await generateActionBarElement(data, fields, activeFields, currentDefaultFields)}
                    </div>
                </div>
                <div class="main-element">
                    <div id="element-id" class="element">
                        <div class="information">
                            ${await generateBodyElement(data, fields, activeFields)}
                        </div>
                    </div>
                    <div id="comments-element-id" class="comments-element" currentAuthor='${''}'>
                        <div id="comments-sidebar-id" class="comments-sidebar">
                            ${await generateCommentElement(data)}
                        </div>
                    </div>
                </div>
                
                <script src="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'edit-service.js'))}"></script>
                </form>
            </body>
    
        `;
    }
}

async function getSavedFields(entityType: string) {
    try {
        let res: string[] | undefined = await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.getFields', entityType);
        return res;
    } catch (e: any) {
        vscode.window.showErrorMessage('Error in retrieving saved fields data.');
        return undefined;
    }
}

/**
* Generating selected options for single select and multiselect
* @param field A single field.
* @param data The current OctaneEntity.
* @return Options for given field.
*/
async function generateSelectOptions(field: any, data: any | OctaneEntity | undefined) {
    if (field && field.field_type_data && field.field_type_data.targets && data) {
        var options = [];
        for (const target of field.field_type_data.targets) {
            let fullDataForEntity = (await OctaneService.getInstance().getFullDataForEntity(target.type, field, data));
            if (fullDataForEntity && fullDataForEntity.data) {
                options.push(...(fullDataForEntity.data));
            }
        }
        return options;
    }
    getLogger('vs').warn('Error generating select options for field.', field);
    return;
}

/**
* Generating icon for given entity based on type or subtype
* @param entity OctaneEntity
* @return A pair of ["icon symbol", "color"]
*/
function getDataForSubtype(entity: OctaneEntity | undefined): [string, string] {
    if (entity?.type === 'task') {
        return ['T', '#1668c1'];
    }
    if (entity?.type === 'bdd_spec') {
        return ['BSP', '#118c4f'];
    }
    if (entity?.subtype) {
        if (entity?.subtype === 'defect') { return ["D", "#b21646"]; }
        if (entity?.subtype === 'story') { return ["US", "#ffb000"]; }
        if (entity?.subtype === 'quality_story') { return ["QS", "#33c180"]; }
        if (entity?.subtype === 'feature') { return ["F", "#e57828"]; }
        if (entity?.subtype === 'scenario_test') { return ["BSC", "#75da4d"]; }
        if (entity?.subtype === 'test_manual') { return ["MT", "#00abf3"]; }
        if (entity?.subtype === 'test_automated') { return ["AT", "#9b1e83"]; }
        if (entity?.subtype === 'gherkin_test') { return ["GT", "#00a989"]; }
        if (entity?.subtype === 'test_suite') { return ["TS", "#271782"]; }
        if (entity?.subtype === 'requirement_document') { return ["RD", "#0b8eac"]; }
        if (entity?.subtype === 'requirement_folder') { return ["RF", "#bbb"]; }
        if (entity?.subtype === 'run_suite') { return ["SR", "#5216ac"]; }
        if (entity?.subtype === 'run_manual') { return ["MR", "#29ceff"]; }
        if (entity?.subtype === 'epic') { return ["E", "#7425AD"]; }
        if (entity?.subtype === 'run_automated') { return ["AR", "#ba47ee"]; }
        if (entity?.subtype === 'gherkin_automated_run') { return ["GAR", "#ba47e2"]; }
    }
    return ['', ''];
}

/**
* Generating html code for phase selection
* @param data OctaneEntity
* @param fields all fields for given OctaneEntity
* @param activeFields all active fields for given OctaneEntity
* @param currentDefaultFields all default fields for given OctaneEntity
* @return html code as string
*/
async function generateActionBarElement(data: any | OctaneEntity | undefined, fields: any[], activeFields: string[] | undefined, currentDefaultFields: string[] | undefined): Promise<string> {
    let html: string = ``;
    try {
        if (data.phase) {
            let mapFields = new Map<string, any>();
            fields.forEach((field): any => {
                mapFields.set(field.label, field);
            });
            html += FieldTemplateFactory.getTemplate(mapFields.get('Phase'), data).generate();
            html += `</select>
            <script type="text/javascript">
                $(document).ready(function() {
                    $('#select_phase').multiselect({
                        maxHeight: 400
                    });
                });
            </script>`;
        }
        html += `
                    <button title="Save" id="saveId" class="save" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm2 16H5V5h11.17L19 7.83V19zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM6 6h9v4H6z"/></svg>
                    </button>
                    <button title="Refresh" id="refresh" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                    </button>
                    <button title="Open in browser" id="openInBrowser" type="button">
                    <svg style="margin: 0rem 0rem 0rem 0.22rem;" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="16px" height="16px" viewBox="0 0 16 16" enable-background="new 0 0 16 16" xml:space="preserve">  <image id="image0" width="16" height="16" x="0" y="0"
                            href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAACBjSFJN
                        AAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABPlBMVEU8r9wAAAA8r9w8r9w8
                        r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8
                        r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8
                        r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8
                        r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8
                        r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8r9w8
                        r9w8r9w8r9w8r9w8r9w8r9z///8oFSlUAAAAaHRSTlMAAAYnjNTyGo20029l0rUZHLZLP5lmPhsF
                        g8nISGBJhSSzLe++4+bkLIRTiotUxoJeTQ5qUsXrXV9Fl896Y8TqXGsmbdrnKmn2/vQ1Sv0Y+fWl
                        zqQr3cKyf5uPOstWWQkwZ6kfiG5wPP2isbsAAAABYktHRGm8a8S0AAAACXBIWXMAAAsTAAALEwEA
                        mpwYAAAAB3RJTUUH5QwCEC0tnHeg8QAAAO1JREFUGNNFj3lTgnAYhN9FEFKyNDGTKASzIMy8kg7T
                        srJLu8sOu7T8ff9PIDTMtH8+M7vzLBGBC/FCOCzwIQ7kBaI0FYnKcnQ6Js14BLPxxFwSioJkKhGf
                        B6UXhIy6CE3DkpoRljnSszDM3Eo+v5oz15DVybJhr8OvwLFRsGgDKG6WyhUZqBaBGm3VXXV7Z1ff
                        UxrSvltvUrN1cNg+YscnnQCo0E4ZO2PnF0Hlst1lPqiJcKr+aO+KXd/csrv7h0fTwJNOfcYDzy+v
                        7p+Ylaa3xuD94xOdL1895ql/Y8j3Rz+K/BucGwPc0Pm/PwGN2CP+EoNwngAAACV0RVh0ZGF0ZTpj
                        cmVhdGUAMjAyMS0xMi0wMlQxMzo0NTo0NSswMzowMD81oSsAAAAldEVYdGRhdGU6bW9kaWZ5ADIw
                        MjEtMTItMDJUMTM6NDU6NDUrMDM6MDBOaBmXAAAAAElFTkSuQmCC" />
                    </svg>
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
        //mapFields: all fields exept for id, name, and phase
        let mapFields = new Map<string, any>();
        fields.forEach((field): any => {
            if (field.name !== "id" && field.name !== "phase" && field.name !== "name") {
                mapFields.set(field.label, field);
            }
        });
        mapFields = new Map([...mapFields].sort((a, b) => String(a[0]).localeCompare(b[0])));
        html += FieldTemplateFactory.getTemplate({ field_type: 'fields_select' }, mapFields, {defaultFields: currentDefaultFields, activeFields: activeFields}).generate();
        // html += `
        //         <div style="margin: 0rem 0rem 0rem 0.5rem;" id="container_filter_multiselect" class="dropleft">
        //             <select multiple="multiple" id="filter_multiselect" data-display="static" defaultFields="${(<any>JSON.stringify(currentDefaultFields ?? '')).replaceAll('"', '\'')}">
        //         `;
        // for (const [key, field] of mapFields) {

        //     if (field) {
        //         const getFieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
        //         if (isSelectedField(getFieldId, activeFields)) {
        //             filteredFields = filteredFields.concat(field.name);
        //         } else {
        //             filteredFields = filteredFields.filter(f => f !== field.name);
        //         }
        //         html += `<option data-label="${field.label}" ${selected(filteredFields.includes(field.name))} value='${getFieldId}'>${field.label}</option>`;
        //     }
        // }
        // html += `
        //         </select>
        //     </div>`;
        if (data.subtype && !OctaneService.entitiesToOpenExternally.includes(data.subtype)) {
            html += `
            <button title="Add to MyWork" id="addToMyWork" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
            `;
        }
    } catch (e: any) {
        getLogger('vs').error('Error generating action bar for entity.', e);
    }
    return html;
}

/**
* Generating html code for comment section of view
* @param data OctaneEntity
* @return html code as string
*/
async function generateCommentElement(data: any | OctaneEntity | undefined): Promise<string> {
    let html: string = ``;
    try {
        let comments = await OctaneService.getInstance().getCommentsForEntity(data);
        getLogger('vs').debug("comments", comments);
        if (comments) {
            const sortedComments = comments.sort((a: Comment, b: Comment) => new Date(b.creationTime ?? '').getTime() - new Date(a.creationTime ?? '').getTime());
            // eslint-disable-next-line @typescript-eslint/naming-convention
            html += FieldTemplateFactory.getTemplate({ field_type: 'comment' }, sortedComments).generate();
        }
    } catch (e: any) {
        getLogger('vs').error('Error generating comments for entity.', e);
    }
    return html;
}

/**
* Generating html code for main section of view
* @param data OctaneEntity
* @param fields all fields for given OctaneEntity
* @param activeFields all active fields for given OctaneEntity
* @return html code as string
*/
async function generateBodyElement(data: any | OctaneEntity | undefined, fields: any[], activeFields: string[] | undefined): Promise<string> {
    let html: string = ``;
    try {
        let filteredFields: string[] = [];
        let mapFields = new Map<string, any>();
        fields.forEach((field): any => {
            if (field.name !== "id" && field.name !== "phase" && field.name !== "name") {
                mapFields.set(field.name, field);
            }
        });
        mapFields = new Map([...mapFields].sort((a, b) => String(a[0]).localeCompare(b[0])));
        for (const [key, field] of mapFields) {
            if (field) {
                if (isSelectedField(field.label.replaceAll(" ", "_").replaceAll('"', ""), activeFields)) {
                    filteredFields = filteredFields.concat(field.name);
                } else {
                    filteredFields = filteredFields.filter(f => f !== field.name);
                }
            }
        }
        html += `<div class="information-container-full">`;
        html += FieldTemplateFactory.getTemplate(mapFields.get('description'), data).generate();
        html += `</div>`;

        if (!await isSelectedField("Description", activeFields)) {
            html += `
                <script>
                    document.getElementById("container_Description").style.display = "none";
                </script>
            `;
        }
        html += `<div class="information-container">`;
        for (const [key, field] of mapFields) {
            if (field) {
                let fieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
                if (!['description', 'phase', 'name'].includes(key)) {
                    // Refactored code
                    html += FieldTemplateFactory.getTemplate(field, data).generate();
                }
                if (filteredFields.includes(field.name)) {
                    html += `
                    <script>
                        document.getElementById("container_${fieldId}").style.display = "flex";
                    </script>
                `;
                }
            }
        }
        html += `</div>`;
    } catch (e: any) {
        getLogger('vs').error("Error while generating fields", e);
    }
    return html;
}

function isSelectedField(fieldName: string, activeFields: string[] | undefined) {
    if (fieldName) {
        if (activeFields && activeFields.includes(fieldName)) {
            return true;
        }
    }
    return false;
}

function selected(isSelected: boolean): string {
    return isSelected ? 'selected="selected"' : '';
}

function getFieldValue(data: any, fieldName: string): string | any[] {
    const field = data[fieldName];
    if (field === null || field === undefined) {
        return '';
    }
    if (field['data']) {
        const ref: string[] = [];
        field['data'].forEach((r: any) => {
            ref.push(r.name);
        });
        return ref.length ? ref : '';
    }
    if (field['name']) {
        return field['name'];
    }
    if (field['full_name']) {
        return field['full_name'];
    }
    return field;
}

/**
* Save selected fields in memory
* @param type OctaneEntity type or subtype
*/
function saveDefaultFieldsForEntityType(type: string): void {
    let defaultFields = defaultFieldMap.get(type);
    if (defaultFields) {
        vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', { fields: defaultFields }, type);
    }
}

const fieldNameMap: Map<String, String> = new Map([
    ['application_module', 'product_areas']
]);

//TODO extract to json
const defaultFieldMap: Map<String, string[]> = new Map([
    ['defect', ["Application_modules", "Blocked", "Blocked_reason", "Closed_on", "Creation_time", "Defect_type", "Description", "Detected_by", "Detected_in_release", "Environment", "Feature", "Last_modified", "Owner", "Priority", "Release", "Severity", "Sprint", "Story_points", "Team"]],
    ['story', ["Application_modules", "Author", "Blocked", "Blocked_reason", "Creation_time", "Description", "Feature", "Item_origin", "Last_modified", "Owner", "Release", "Sprint", "Story_points", "Team", "Test_Coverage"]],
    ['quality_story', ["Application_modules", "Author", "Blocked", "Blocked_reason", "Creation_time", "Description", "Feature", "Item_origin", "Last_modified", "Owner", "Quality_story_type", "Release", "Sprint", "Story_points"]],
    ['feature', ["Owner", "Author", "Creation_time", "Last_modified", "Story_points", "Item_origin", "Test_Coverage", "Epic", "Priority", "Application_modules", "Release", "Milestone", "Team", "Target_Sprint", "Items_in_releases", "Progress", "Feature_type", "Actual_story_points", "Description"]],
    ['gherkin_test', ["Application_modules", "Automation_status", "Backlog_Coverage", "Created", "Description", "Designer", "Estimated_duration_(minutes)", "Last_modified", "Owner", "Test_type", "Testing_tool_type"]],
    ['test_manual', ["Application_modules", "Automation_status", "Backlog_Coverage", "Created", "Description", "Designer", "Estimated_duration_(minutes)", "Last_modified", "Owner", "Test_type", "Testing_tool_type"]],
    ['run_suite', ["Content", "Default_Environment", "Description", "Draft_run", "Last_modified", "Native_status", "Release", "Started", "Suite_name"]],
    ['requirement_document', ["Author", "Creation_time", "Description", "Release", "Last_modified", "Owner"]],
    ['task', ["Author", "Story", "Last_modified", "Estimated_hours", "Remaining_hours", "Owner", "Description", "Creation_time", "Invested_hours", "Type"]],
    ['run_manual', ["Test_name", "Native_status", "Author", "Run_by", "Started", "Duration", "Content", "Release", "Milestone", "Sprint", "Version_from_Release", "Draft_run", "Last_modified", "Draft_run", "Environment", "Backlog_Coverage", "Description"]],
    ['epic', ["Description", "Owner", "Creation_time", "Last_modified", "Milestone", "Story_points", "Author", "Item_origin", "Items_in_releases", "Progress", "Epic_type"]],
    ['bdd_spec', ["Description", "Creation_time", "Last_modified", "Author", "Owner", "Application_modules", "Automation_status", "Linked_backlog_items", "Code_alignment"]],
    ['scenario_test', ["Test_type", "Testing_tool_type", "Owner", "Estimated_duration_(minutes)", "Created", "Last_modified", "Backlog_Coverage", "Application_modules", "Automation_status", "BDD_Spec", "Description"]],
    ['test_automated', ["Framework", "Testing_tool_type", "Owner", "Test_level", "Test_type", "Branch", "Application_modules", "Backlog_Coverage", "Executable", "Description"]],
    ['test_suite', ["Test_type", "Testing_tool_type", "Owner", "Estimated_duration_(minutes)", "Designer", "Created", "Last_modified", "Backlog_Coverage", "Application_modules", "Description"]],
    ['run_automated', ["Test_name", "Draft_run", "Run_by", "Assigned_to_(On_it)", "Component", "Started", "Duration", "Backlog_Coverage"]],
    ['gherkin_automated_run', ["Test_name", "Native_status", "Run_by", "Started", "Duration", "Content", "Last_modified", "Backlog_Coverage"]],
    ['requirement_folder', ["Author", "Owner", "Release", "Creation_time", "Last_modified"]],
    ['default', ["Description"]]
]);

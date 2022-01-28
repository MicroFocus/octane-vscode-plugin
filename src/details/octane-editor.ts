import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { OctaneEntity } from '../octane/model/octane-entity';
import * as path from 'path';
import { getLogger } from 'log4js';
import { Comment } from '../octane/model/comment';
import { FieldTemplateFactory } from './field-template-factory';
import * as entitiesInMyWork from '../configurations/entities-in-my-work.json';
import * as defaultFieldsMap from '../configurations/default-fields.json';
import * as entityIcons from '../configurations/entity-icons.json';
import { ActionButtonTemplateFactory } from './action-button-template-factory';
import { FieldsSelectButtonTemplate } from './action-buttons/fields-select-button-template';


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

        context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.setFields', async (data, entityType) => {
            if (data.fields) {
                this.logger.debug(data);
                await context.workspaceState.update(`visibleFields-${entityType}`,
                    JSON.stringify(data)
                );
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.getFields', (entityType) => {
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
        }));
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
            currentDefaultFields = getDefaultFields(mementoKey);
        }
        if (!currentDefaultFields) {
            currentDefaultFields = getDefaultFields('default');
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
                    ${await FieldTemplateFactory.getTemplate(mapFields.get('Name'), data, true).generate()}
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
    if (entity === undefined) {
        return ['', ''];
    }
    let icon;
    if (entity.type && entity.type in entityIcons) {
        return entityIcons[entity.type as keyof typeof entityIcons] as [string, string];
    }
    if (entity.subtype && entity.subtype in entityIcons) {
        return entityIcons[entity.subtype as keyof typeof entityIcons] as [string, string];
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
            html += await FieldTemplateFactory.getTemplate(mapFields.get('Phase'), data, true).generate();
        }
        html += ActionButtonTemplateFactory.getTemplate('save').generate();
        html += ActionButtonTemplateFactory.getTemplate('refresh').generate();
        html += ActionButtonTemplateFactory.getTemplate('openInBrowser').generate();
        html += ActionButtonTemplateFactory.getTemplate('comments').generate();

        //mapFields: all fields exept for id, name, and phase
        let mapFields = new Map<string, any>();
        fields.forEach((field): any => {
            if (field.name !== "id" && field.name !== "phase" && field.name !== "name") {
                mapFields.set(field.label, field);
            }
        });
        mapFields = new Map([...mapFields].sort((a, b) => String(a[0]).localeCompare(b[0])));
        // eslint-disable-next-line @typescript-eslint/naming-convention
        html += await new FieldsSelectButtonTemplate({ field_type: 'fields_select' }, mapFields, true, { defaultFields: currentDefaultFields, activeFields: activeFields }).generate();

        let typeForGeneratingButton = data.subtype ? data.subtype : data.type;
        if (typeForGeneratingButton && entitiesInMyWork.includes(typeForGeneratingButton)) {
            html += await ActionButtonTemplateFactory.getTemplate('addToMyWork').generate();
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
            html += await FieldTemplateFactory.getTemplate({ field_type: 'comment' }, sortedComments, true).generate();
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
        html += await FieldTemplateFactory.getTemplate(mapFields.get('description'), data, isSelectedField("Description", activeFields)).generate();
        html += `</div>`;

        html += `<div class="information-container">`;
        for (const [key, field] of mapFields) {
            if (field) {
                let fieldId = field.label.replaceAll(" ", "_").replaceAll('"', "");
                if (!['description', 'phase', 'name'].includes(key)) {
                    // Refactored code
                    html += await FieldTemplateFactory.getTemplate(field, data, filteredFields.includes(field.name)).generate();
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
    let defaultFields = getDefaultFields(type);
    if (defaultFields) {
        vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', { fields: defaultFields }, type);
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

function getDefaultFields(type: string): string[] {
    if (type in defaultFieldsMap) {
        return defaultFieldsMap[type as keyof typeof defaultFieldsMap];
    }
    return defaultFieldsMap.default;
}

const fieldNameMap: Map<String, String> = new Map([
    ['application_module', 'product_areas']
]);


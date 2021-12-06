import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { MyWorkProvider } from '../treeview/my-work-provider';
import { OctaneEntity } from '../octane/model/octane-entity';
import { Transition } from '../octane/model/transition';
import { stripHtml } from 'string-strip-html';
import * as path from 'path';
import { getLogger, Logger } from 'log4js';
import { Comment } from '../octane/model/comment';

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
        // this.onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<OctaneEntityDocument>>().event;
        context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.details.closeAll', () => {
            this.webviewPanels.closeAll();
        }));
    }

    // onDidChangeCustomDocument: vscode.Event<vscode.CustomDocumentEditEvent<OctaneEntityDocument>> | vscode.Event<vscode.CustomDocumentContentChangeEvent<OctaneEntityDocument>>;

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
                    await document.updated();
                    webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview, this.context, document.entity, document.fields);
                    webviewPanel.webview.postMessage({
                        type: 'init',
                        from: 'webview'
                    });
                }
                if (m.type === 'refresh') {
                    // document.entity = await OctaneService.getInstance().getDataFromOctaneForTypeAndId(document.entity.type, document.entity.subtype, document.entity.id);
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
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.openInBrowser', { entity: document.entity });
                }
                if (m.type === 'get-data-for-select') {
                    if (m.data && m.data.field) {
                        let field = document.fields.filter((f: any) => f.name === m.data.field);
                        if (field) {
                            let data = await generateSelectOptions(field[0], document.entity);
                            if (data) {
                                let selectedField;
                                if (field.field_type_data && field.field_type_data.multiple) {
                                    selectedField = getFieldValue(data, fieldNameMap.get(field.name) ?? field.name);
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

                            console.log("data", data);
                        }
                    }

                }
            });

        } catch (e) {
            this.logger.error(e);
            throw e;
        }

        this.webviewPanels.add(document.uri, webviewPanel);
    }

    private async getHtmlForWebview(webview: vscode.Webview, context: any, data: any | OctaneEntity | undefined, fields: any[]): Promise<string> {
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
            context.extensionUri, 'media', 'vscode.css'));
        const myStyle = webview.asWebviewUri(vscode.Uri.joinPath(
            context.extensionUri, 'media', 'my-css.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            context.extensionUri, 'media', 'edit-service.js'));

        const jqueryJs = webview.asWebviewUri(vscode.Uri.joinPath(
            context.extensionUri, 'media', 'jquery.min.js'));
        const bootstrapCss = webview.asWebviewUri(vscode.Uri.joinPath(
            context.extensionUri, 'media', 'bootstrap.min.css'));
        const bootstrapJs = webview.asWebviewUri(vscode.Uri.joinPath(
            context.extensionUri, 'media', 'bootstrap.bundle.min.js'));
        const bootstrapMultiselectCss = webview.asWebviewUri(vscode.Uri.joinPath(
            context.extensionUri, 'media', 'bootstrap-multiselect.min.css'));
        const bootstrapMultiselectJs = webview.asWebviewUri(vscode.Uri.joinPath(
            context.extensionUri, 'media', 'bootstrap-multiselect.min.js'));
            
        let resetFilterValuesForDefect = [
            "Application_modules",
            "Blocked",
            "Blocked_reason",
            "Closed_on",
            "Creation_time",
            "Defect_type",
            "Description",
            "Detected_by",
            "Detected_in_release",
            "Environment",
            "Feature",
            "Last_modified",
            "Owner",
            "Priority",
            "Release",
            "Severity",
            "Sprint",
            "Story_points",
            "Team"
        ];

        let resetFilterValuesForStory = [
            "Application_modules",
            "Author",
            "Blocked",
            "Blocked_reason",
            "Creation_time",
            "Description",
            "Feature",
            "Item_origin",
            "Last_modified",
            "Owner",
            "Release",
            "Sprint",
            "Story_points",
            "Team",
            "Test_Coverage",
        ];

        let resetFilterValuesForQStory = [
            "Application_modules",
            "Author",
            "Blocked",
            "Blocked_reason",
            "Creation_time",
            "Description",
            "Feature",
            "Item_origin",
            "Last_modified",
            "Owner",
            "Quality_story_type",
            "Release",
            "Sprint",
            "Story_points",
            "Team"
        ];

        let resetFilterValuesForFeature = [
            "Application_modules",
            "Blocked",
            "Blocked_reason",
            "Closed_on",
            "Creation_time",
            "Defect_type",
            "Description",
            "Detected_by",
            "Detected_in_release",
            "Environment",
            "Feature",
            "Last_modified",
            "Owner",
            "Priority",
            "Release",
            "Severity",
            "Sprint",
            "Story_points",
            "Team"
        ];

        // eslint-disable-next-line @typescript-eslint/naming-convention
        let resetFilterValuesForGT_MT = [
            "Application_modules",
            "Automation_status",
            "Backlog_Coverage",
            "Created",
            "Description",
            "Designer",
            "Estimated_duration_(minutes)",
            "Last_modified",
            "Owner",
            "Test_type",
            "Testing_tool_type"
        ];

        let resetFilterValuesForRunSuite = [
            "Content",
            "Default_Environment",
            "Description",
            "Draft_run",
            "Last_modified",
            "Native_status",
            "Release",
            "Started",
            "Suite_name"
        ];

        let resetFilterValuesForRD = [
            "Author",
            "Creation_time",
            "Description",
            "Release",
            "Last_modified",
            "Owner"
        ];

        let resetFilterValuesForTask = [
            "Author",
            "Story",
            "Last_modified",
            "Estimated_hours",
            "Remaining_hours",
            "Owner",
            "Description",
            "Creation_time",
            "Invested_hours",
            "Type"
        ];

        var activeFields: string[] | undefined = [];
        if (data.subtype !== null && data.subtype !== undefined && data.subtype !== "") {
            activeFields = await getSavedFields(data.subtype);
            if (activeFields === undefined) {
                if (data.subtype === 'defect') {
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', { fields: resetFilterValuesForDefect }, data.subtype);
                }
                if (data.subtype === 'story') {
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', { fields: resetFilterValuesForStory }, data.subtype);
                }
                if (data.subtype === 'quality_story') {
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', { fields: resetFilterValuesForQStory }, data.subtype);
                }
                if (data.subtype === 'feature') {
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', { fields: resetFilterValuesForFeature }, data.subtype);
                }
                if (data.subtype === 'gherkin_test') {
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', { fields: resetFilterValuesForGT_MT }, data.subtype);
                }
                if (data.subtype === 'test_manual') {
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', { fields: resetFilterValuesForGT_MT }, data.subtype);
                }
                if (data.subtype === 'run_suite') {
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', { fields: resetFilterValuesForRunSuite }, data.subtype);
                }
                if (data.subtype === 'requirement_document') {
                    vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', { fields: resetFilterValuesForRD }, data.subtype);
                }
                activeFields = await getSavedFields(data.subtype);
            }
        } else {
            if (data.type !== null && data.type !== undefined) {
                activeFields = await getSavedFields(data.type);
                if (activeFields === undefined) {
                    if (data.type === 'task') {
                        vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.setFields', { fields: resetFilterValuesForTask }, data.type);
                    }
                    activeFields = await getSavedFields(data.type);
                }
            }
        }

        return `
            <!DOCTYPE html>
            <head>
                <!-- Include Twitter Bootstrap and jQuery: -->
                <link rel="stylesheet" href="${bootstrapCss}" type="text/css"/>
                <link rel="stylesheet" href="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'font-awesome.css'))}" type="text/css"/>
                <script type="text/javascript" src="${jqueryJs}"></script>
                <script type="text/javascript" src="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'moment.min.js'))}"></script>
                <script type="text/javascript" src="${bootstrapJs}"></script>
                <script type="text/javascript" src="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'bootstrap-datetimepicker.min.js'))}"></script>
                
                <!-- Include the plugin's CSS and JS: -->
                <script type="text/javascript" src="${bootstrapMultiselectJs}"></script>
                <link rel="stylesheet" href="${bootstrapMultiselectCss}" type="text/css"/>
                <link rel="stylesheet" href="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'bootstrap-datetimepicker.css'))}" type="text/css"/>
                <link href="${styleVSCodeUri}" rel="stylesheet" />
                <link href="${myStyle}" rel="stylesheet" />
            </head>
            <body>
                <form id="mainform">
                <div class="top-container">
                    <div class="icon-container" style="background-color: ${getDataForSubtype(data)[1]}">
                        <span class="label">${getDataForSubtype(data)[0]}</span>
                    </div>
                    <div class="name-container">
                        <h6 style="margin: 0rem 0.5rem 0rem 0rem;">${data?.id ?? ''}</h6> <input style="background: transparent; font-size: 1rem;" id="name" type="text" value="${data?.name ?? ''}">
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
                </form>
            </body>
    
        `;
    }
}

async function generateSelectOptions(field: any, data: any | OctaneEntity | undefined) {
    if (field && field.field_type_data && field.field_type_data.targets && data) {
        return await OctaneService.getInstance().getFullDataForEntity(field.field_type_data.targets[0].type, field, data);
    }
    getLogger('vs').warn('Error generating select options for field.', field);
    return;
}

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
    }
    return ['', ''];
}

async function generatePhaseSelectElement(data: any | OctaneEntity | undefined, fields: any[], activeFields: string[] | undefined): Promise<string> {
    let html: string = ``;
    try {
        if (data.phase) {
            html += `
                <div>
                    <h6 style="margin:1.3rem 0.5rem 0rem 0rem">Current phase: ${getFieldValue(data.phase, 'name')} |  Move to </h6>
                </div>
            `;
        }
        if (data.phase) {
            let transitions: Transition[] = OctaneService.getInstance().getPhaseTransitionForEntity(data.phase.id);
            html += `<div style="margin-top: 1rem;">
            <select id="select_phase" name="action" class="action">`;
            // html += `
            //     <option value="none">${getFieldValue(data, 'phase')}</option>
            // `;
            // html += `
            //     <option value="none"></option>
            // `;
            transitions.forEach((target: any) => {
                if (!target) { return; }
                html += `
                <option value='${JSON.stringify(target.targetPhase)}'>${target.targetPhase.name}</option>
            `;
            });
        }
        html += `</select>
                <script type="text/javascript">
                    $(document).ready(function() {
                        $('#select_phase').multiselect({
                            maxHeight: 400
                        });
                    });
                </script>
                </div>
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
        let mapFields = new Map<string, any>();
        fields.forEach((field): any => {
            if (field.name !== "id" && field.name !== "phase" && field.name !== "name") {
                mapFields.set(field.label, field);
            }
        });
        mapFields = new Map([...mapFields].sort((a, b) => String(a[0]).localeCompare(b[0])));
        html += `
                <div style="margin: 0rem 0rem 0rem 0.5rem;" id="container_filter_multiselect" class="dropleft">
                    <select multiple="multiple" id="filter_multiselect" data-display="static">
                `;
        for (const [key, field] of mapFields) {

            if (field) {
                if (await isSelectedField(field.label.replaceAll(" ", "_"), activeFields)) {
                    filteredFields = filteredFields.concat(field.name);
                } else {
                    filteredFields = filteredFields.filter(f => f !== field.name);
                }
                if (filteredFields.includes(field.name)) {
                    html += `<option data-label="${field.label}" selected="selected" value='${JSON.stringify(field)}'>${field.label}</option>`;
                } else {
                    html += `<option data-label="${field.label}" value='${JSON.stringify(field)}'>${field.label}</option>`;
                }
            }
        }
        if (data.subtype && OctaneService.entitiesToOpenExternally.includes(data.subtype)) {
            html += `
                </select>
            </div>`;
        } else {
            html += `
                </select>
            </div>
            <button title="Add to MyWork" id="addToMyWork" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
            `;
        }
    } catch (e: any) {
        vscode.window.showErrorMessage('Error generating phase select for entity.');
    }
    return html;
}

async function generateCommentElement(data: any | OctaneEntity | undefined, fields: any[]): Promise<string> {
    let html: string = ``;
    try {
        html += `   <br>
                    <hr>
                    Comments
                    <div class="information-container">
                        <div class="comments-container">

                            <input id="comments-text" type="text">
                            <button id="comments" type="button">Comment</button>
                        </div>
                    </div>
                    <br>`;
        let comments = await OctaneService.getInstance().getCommentsForEntity(data);
        getLogger('vs').info("comments", comments);
        if (comments) {
            for (const comment of comments) {
                html += `
                    <div class="information-container">
                        ${comment.author?.fullName ?? ''}: <textarea type="text" value="${stripHtml(comment.text).result}">${stripHtml(comment.text).result}</textarea>
                    </div>
                `;
            }
        }
        html += `   <br>
                    <hr>`;
    } catch (e: any) {
        vscode.window.showErrorMessage('Error generating comments for entity.');
    }
    return html;
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
    try {
        let counter: number = 0;
        const columnCount: number = 2;
        let filteredFields: string[] = [];
        let mainFields: string[] = ['name'];
        let mapFields = new Map<string, any>();
        fields.forEach((field): any => {
            if (field.name !== "id" && field.name !== "phase" && field.name !== "name") {
                mapFields.set(field.name, field);
            }
        });
        mapFields = new Map([...mapFields].sort((a, b) => String(a[0]).localeCompare(b[0])));
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
            }
        }
        html += `
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
                    <div class="information-container">
                        <div class="description-container" id="container_Description">
                            <textarea id="description" class="description" type="text">${stripHtml(getFieldValue(data, 'description').toString()).result}</textarea>
                        </div>
                        <script>
                            document.getElementById("description").readOnly = !false;
                        </script>
                    </div>
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
                        <div class="select-container-multiple" id="container_${field.label.replaceAll(" ", "_")}">
                            <label name="${field.name}">${field.label}</label>
                            <select multiple="multiple" id="${field.name}">
                        `;
                            html += `
                            </select>
                        </div>
                        `;
                        } else {
                            if (field.editable) {
                                if(field.name === 'author') {
                                    html += `
                                    <div class="select-container-single" id="container_${field.label.replaceAll(" ", "_")}">
                                        <label name="${field.name}">${field.label}</label>
                                        <select disabled id="${field.name}">
                                    `;
                                } else {
                                    html += `
                                    <div class="select-container-single" id="container_${field.label.replaceAll(" ", "_")}">
                                        <label name="${field.name}">${field.label}</label>
                                        <select id="${field.name}">
                                    `;
                                }
                                html += `<option value="none" selected="selected" disabled hidden>${getFieldValue(data, field.name)}</option>`;
                                        html += `
                                        </select>
                                    </div>`;
                            } else {
                                html += `
                                <div style="padding: unset;" class="container" id="container_${field.label.replaceAll(" ", "_")}">
                                    <label class="active" for="${field.label}">${field.label}</label>
                                    <input style="border: 0.5px solid; border-color: var(--vscode-dropdown-border);" id="${field.name}" type="${field.field_type}" value="${getFieldValue(data, field.name)}">
                                    <script>
                                        document.getElementById("${field.name}").readOnly = !${field.editable};
                                    </script>
                                </div>
                            `;
                            }
                        }
                    } else {
                        if ((field.field_type === 'string' && field.type === 'field_metadata') && (field.name === 'test_status' || field.name === 'last_runs' || field.name === 'progress' || field.name === 'commit_files')) {
                            let val: any = getFieldValue(data, field.name);
                            let containerValue = '';
                            let tooltip = '';
                            if (typeof (val) === 'string' && val !== '') {
                                try {
                                    val = JSON.parse(val);
                                } catch (e: any) {
                                    getLogger('vs').error(`While evaluating JSON value: ${val} `, e);
                                }
                                 
                                if (field.name === 'last_runs' || field.name === 'test_status') {
                                    //label - Test Coverage
                                    tooltip = 'Test coverage \n ' + (val?.passed ?? 0) + ' Passed \n ' + (val?.failed ?? 0) + ' Failed \n ' + (val?.needsAttention ?? 0) + ' Require Attention \n ' + (val?.planned ?? 0) + ' Planned \n ' + (val?.testNoRun ?? 0) + ' Tests did not run \n';
                                    containerValue = (val?.passed ?? 0) + ' Passed, ' + (val?.failed ?? 0) + ' Failed, ' + (val?.needsAttention ?? 0) + ' Require Attention, ' + (val?.planned ?? 0) + ' Planned, ' + (val?.testNoRun ?? 0) + ' Tests did not run';
                                }
                                if (field.name === 'progress') {
                                    //label - Progress
                                    tooltip = 'Progress \n ' + (val?.tasksInvestedHoursSumTotal ?? 0) + ' Invested hours \n ' + (val?.tasksRemainingHoursSumTotal ?? 0) + ' Remaining hours \n ' + (val?.tasksEstimatedHoursSumTotal ?? 0) + ' Estimated hours \n ';
                                    containerValue = (val?.tasksInvestedHoursSumTotal ?? 0) + ' Invested hours, ' + (val?.tasksRemainingHoursSumTotal ?? 0) + ' Remaining hours, ' + (val?.tasksEstimatedHoursSumTotal ?? 0) + ' Estimated hours';
                                }
                                if (field.name === 'commit_files') {
                                    //label - COmmit files
                                    containerValue = (val?.deleted ?? 0) + ' Deleted, ' + (val?.added ?? 0) + ' Added, ' + (val?.edited ?? 0) + ' Edited';
                                }

                            }
                            html += `
                            <div style="padding: unset;" class="container" id="container_${field.label.replaceAll(" ", "_")}">
                                <label class="active" for="${field.label}">${field.label}</label>
                                <input 
                                    title="${tooltip}"
                                    style="border: 0.5px solid; border-color: var(--vscode-dropdown-border); cursor: pointer;" id="${field.name}" type="${field.field_type}" value='${containerValue}'>
                                <script>
                                    document.getElementById("${field.name}").readOnly = !${field.editable};
                                    $(document).ready(function() {
                                        $('[data-toggle="tooltip"]').tooltip();
                                    });
                                </script>
                            </div>
                            `;
                        } else {
                            if (field.name === 'is_in_filter') {
                                html += `
                                    <div style="padding: unset;" class="container" id="container_${field.label.replaceAll(" ", "_")}">
                                        <label class="active" for="${field.label}">${field.label}</label>
                                        <input style="border: 0.5px solid; border-color: var(--vscode-dropdown-border);" id="${field.name}" type="string" value='${getFieldValue(data, field.name) ? 'Yes' : 'No'}'>
                                        <script>
                                            document.getElementById("${field.name}").readOnly = !${field.editable};
                                        </script>
                                    </div>
                                `;
                            } else if (field.field_type === 'date_time') {
                                html += `
                                <div style="padding: unset;" class="container" id="container_${field.label.replaceAll(" ", "_")}">
                                    <label class="active" for="${field.label}">${field.label}</label>
                                    <input style="border: 0.5px solid; border-color: var(--vscode-dropdown-border);" id="${field.name}" value='${getFieldValue(data, field.name)}' data-toggle="datetimepicker" class="datetimepicker-input" data-target="#${field.name}" disabled="!${field.editable}">
                                </div>
                            `;
                            } else if (field.field_type === 'boolean') {
                                html += `
                                <div class="select-container-single" id="container_${field.label.replaceAll(" ", "_")}">
                                    <label name="${field.name}">${field.label}</label>
                                    <select id="${field.name}">
                                `;
                                    html += `<option value="true" ${getFieldValue(data, field.name) ? 'selected' : ''}>Yes</option>`;
                                    html += `<option value="false" ${getFieldValue(data, field.name) ? '' : 'selected'}>No</option>`;
                                    html += `
                                    </select>
                                </div>`;
                            } else {
                                html += `
                                <div style="padding: unset;" class="container" id="container_${field.label.replaceAll(" ", "_")}">
                                    <label class="active" for="${field.label}">${field.label}</label>
                                    <input style="border: 0.5px solid; border-color: var(--vscode-dropdown-border);" id="${field.name}" type="${field.field_type}" value='${getFieldValue(data, field.name)}'>
                                    <script>
                                        document.getElementById("${field.name}").readOnly = !${field.editable};
                                    </script>
                                </div>
                            `;
                            }
                        }
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
    } catch (e: any) {
        getLogger('vs').error("comments", e);
        vscode.window.showErrorMessage('Error generating fields for entity.');
    }
    return html;
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

const fieldNameMap: Map<String, String> = new Map([
    ['application_module', 'product_areas']
]);
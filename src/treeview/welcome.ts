import * as vscode from 'vscode';
import { AlmOctaneAuthenticationProvider, AlmOctaneAuthenticationType } from '../auth/authentication-provider';
import { OctaneService } from '../octane/service/octane-service';
import { v4 as uuid } from 'uuid';
import { getLogger } from 'log4js';
import { ErrorHandler } from '../octane/service/error-handler';

export class WelcomeViewProvider implements vscode.WebviewViewProvider {

    private logger = getLogger('vs');

    public static readonly viewType = 'visual-studio-code-plugin-for-alm-octane.myWelcome';

    private view?: vscode.WebviewView;

    private readonly extensionUri: vscode.Uri;

    private wasDisposed = false;

    constructor(context: vscode.ExtensionContext, private readonly authenticationProvider: AlmOctaneAuthenticationProvider) {
        this.logger.debug('WelcomeViewProvider constructed');
        this.extensionUri = context.extensionUri;
        context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myWelcome.refreshEntry', () => {
            this.refresh();
        }));
    }

    public attemptAuthentication() {
        this.logger.debug('attemptAuthentication called.');
    }

    public async refresh() {
        if (this.view && this.view.webview) {
            let content = await this.getHtmlForWebview(this.view.webview);
            if (!this.wasDisposed) {
                this.view.webview.html = content;
            }
        }
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken,
    ) {
        this.logger.info('WelcomeViewProvider.resolveWebviewView called');
        this.logger.debug('context: ', context);
        this.logger.debug('token: ', token);
        this.view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [
                this.extensionUri
            ]
        };

        webviewView.onDidDispose(
            () => {
                this.wasDisposed = true;
            }
        );
        webviewView.webview.html = await this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'attemptAuthentication':
                    {
                        try {
                            const uri = vscode.workspace.getConfiguration('visual-studio-code-plugin-for-alm-octane');
                            //save url to memento
                            let regularUri = data.uri;
                            let regExp = regularUri.match(/\?p=(\d+\/\d+)/) ?? regularUri.match(/(\/?%\d*[A-Za-z]*)/) ?? regularUri.match(/\/ui/);
                            if (regExp) {
                                regularUri = regularUri.split(regExp[0])[0];
                                if (regularUri) {
                                    regularUri = regularUri.split('ui')[0];
                                }
                            }
                            await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.saveLoginData',
                                {
                                    "uri": data.uri,
                                    "url": regularUri.endsWith('/') ? regularUri : regularUri + '/',
                                    "authTypeBrowser": data.browser,
                                    "space": data.space,
                                    "workspace": data.workspace,
                                    "user": data.user
                                }
                            );

                            if (data.browser) {
                                try {
                                    await vscode.authentication.getSession(AlmOctaneAuthenticationProvider.type, ['default'], { createIfNone: true });
                                } catch (e: any) {
                                    // this.logger.error(`Error on login: ${e}`);
                                    vscode.window.showErrorMessage("Error on login.");
                                    // throw e;
                                }
                            } else {
                                try {
                                    OctaneService.getInstance().storePasswordForAuthentication(data.password);
                                    // await this.authenticationProvider.createManualSession(data.password);
                                    await vscode.authentication.getSession(AlmOctaneAuthenticationProvider.type, ['default'], { createIfNone: true });
                                } catch (e: any) {
                                    // this.logger.error(`Error on login: ${e}`);
                                    vscode.window.showErrorMessage("Error on login.");
                                    // throw e;
                                } finally {
                                    OctaneService.getInstance().storePasswordForAuthentication(undefined);
                                }
                            }
                        } catch (e) {
                            this.logger.error('While creating session.', e);
                        }
                        break;
                    }
                case 'testConnection':
                    {
                        var authTestResult: any;
                        if (data.uri !== undefined) {
                            let regExp = data.uri.match(/\?p=(\d+\/\d+)/) ?? data.uri.match(/(\/?%\d*[A-Za-z]*)/) ?? data.uri.match(/\/ui/);
                            if (regExp) {
                                data.uri = data.uri.split(regExp[0])[0];
                                if (data.uri) {
                                    data.uri = data.uri.split('ui')[0];
                                }
                            }
                            data.uri = data.uri.endsWith('/') ? data.uri : data.uri + '/';
                        }
                        if (data.browser) {
                            try {
                                authTestResult = await OctaneService.getInstance().testConnectionOnBrowserAuthentication(data.uri);
                                webviewView.webview.postMessage({
                                    type: 'workspaceIdDoesExist',
                                });
                                webviewView.webview.postMessage({
                                    type: 'testConnectionResponse',
                                    authTestResult: authTestResult ? true : false
                                });
                            } catch (e: any) {
                                webviewView.webview.postMessage({
                                    type: 'workspaceIdDoesNotExist',
                                    message: ErrorHandler.handle(e)
                                });
                                webviewView.webview.postMessage({
                                    type: 'testConnectionResponse',
                                    authTestResult: false
                                });
                            }

                        } else {
                            try {
                                authTestResult = await OctaneService.getInstance().testAuthentication(data.uri, data.space, data.workspace, data.user, data.password, undefined, undefined);
                                webviewView.webview.postMessage({
                                    type: 'workspaceIdDoesExist',
                                });
                                webviewView.webview.postMessage({
                                    type: 'testConnectionResponse',
                                    authTestResult: true
                                });
                            } catch (e: any) {
                                webviewView.webview.postMessage({
                                    type: 'workspaceIdDoesNotExist',
                                    message: ErrorHandler.handle(e)
                                });
                                webviewView.webview.postMessage({
                                    type: 'testConnectionResponse',
                                    authTestResult: false
                                });
                            }
                        }

                        break;
                    }
                case 'changeInURL':
                    {
                        let url: string = data.url;
                        let regExp = url.match(/\?p=(\d+\/\d+)\/?#?/);
                        let space = regExp !== null ? regExp[1].split('/')[0] : null;
                        let workspace = regExp !== null ? regExp[1].split('/')[1] : null;
                        if (space === null || workspace === null) {
                            let altRegExp = url.match(/\?p=((\d+)(\/?%?\d*[A-Za-z]*)(\d+))\/?#?/);
                            space = altRegExp !== null ? altRegExp[2] : null;
                            workspace = altRegExp !== null ? altRegExp[4] : null;
                        }
                        if (space === null || workspace === null) {
                            let altRegExp = url.match(/\?[A-Za-z]*&?p=((\d+)(\/?%?\d*[A-Za-z]*)(\d+))\/?#?/);
                            space = altRegExp !== null ? altRegExp[1].split('/')[0] : null;
                            workspace = altRegExp !== null ? altRegExp[1].split('/')[1] : null;
                        }
                        if (space === null || workspace === null) {
                            webviewView.webview.postMessage({
                                type: 'incorrectURLFormat',
                                message: "Could not get sharedspace/workspace ids from URL \n Example: (http|https)://{serverurl[:port]}/?p={sharedspaceid}/{workspaceid}"
                            });
                        } else {
                            webviewView.webview.postMessage({
                                type: 'correctURLFormat',
                                space: space,
                                workspace: workspace
                            });
                        }
                        break;
                    }
                case 'clearAllSavedLoginData':
                    {
                        await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.saveLoginData',
                            {
                                "uri": '',
                                "url": '',
                                "authTypeBrowser": false,
                                "space": '',
                                "workspace": '',
                                "user": ''
                            }
                        );
                        break;
                    }
            }
        });
    }

    async getHtmlForWebview(webview: vscode.Webview): Promise<string> {

        this.logger.info('WelcomeViewProvider.getHtmlForWebview called');

        let loginData: any | undefined = await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.getLoginData');
        const uri: string | undefined = loginData?.uri ?? '';
        let isBrowserAuth: boolean = loginData?.authTypeBrowser ?? false;
        const space = loginData?.space ?? '';
        const workspace = loginData?.workspace ?? '';
        const user = loginData?.user ?? '';

        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'welcome-controller.js'));

        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'vscode.css'));
        const myStyle = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'my-css.css'));



        this.logger.info('WelcomeViewProvider.getHtmlForWebview returning HTML');

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${myStyle}" rel="stylesheet">
				
				<title>Welcome to ALM Octane</title>
			</head>
			<body>
                <div class="main-container">
                    <span>Server URL</span>
                    <input type="text" id="authentication_url_id" class="authentication_url" value="${uri}"></input>
                    <span id="authentication_url_successful" style="display: none"></span>
                </div>
                <div class="main-container">
                    <span>Space</span>
                    <input type="text" disabled style="opacity: 0.6" class="authentication_space" value="${space}"></input>
                </div>
                <div class="main-container">
                    <span>Workspace</span>
                    <input type="text" disabled style="opacity: 0.6" class="authentication_workspace" value="${workspace}"></input>
                </div>
                <hr>
                <div class="main-container" style="flex-direction: row; align-items: center;">
				    <input style="width: unset" id="attempt_authentication_radio_id" class="attempt_authentication_radio" type="radio" name="auth"></input> <label style="margin: unset !important;">Login with username and password</label>
                    <span 
                        title="Log into ALM Octane directly with your username and password, in non-SSO environments. This method saves your login credentials between sessions, so you do not have to re-enter them." 
                        style="margin: 0rem 0rem 0rem 0.5rem; cursor: pointer;  display: flex;">
                        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="16px" height="16px" viewBox="0 0 16 16" enable-background="new 0 0 16 16" xml:space="preserve">  <image id="image0" width="16" height="16" x="0" y="0"
                            href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAACBjSFJN
                        AAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAkFBMVEX///9IjrdKkblMk7pM
                        k7pJj7hGjLZNlbtVnsFYosRZosVYosRKkrlMlbxUnsJZo8dSm8BGj7hQmsBTncI9hLBEjLZTnsNL
                        lbxAibRNmL9Ikrs5ga5EjrhJlb1Djrc/ibRBirU1e6k7gq87g7A2fKo2fKo/h7M/iLQ4fqxNlLtT
                        nMBapchZpMdPmb9JlLz///96MZqwAAAAKXRSTlMAW7Lo5pQWov3RtPLAFx5p9w7BuzDewxXdjQMK
                        zMwYERY4+v5fKObwSo7gz3IAAAABYktHRACIBR1IAAAAB3RJTUUH5QwGDigldgHFqwAAAFFJREFU
                        GNNjYCATMDIxa7KwsiEE2Dk4ubi1eBACvHwMDPzaAii6BIV0hJH5IqK6YuLIAhJ6klLIfGkZWTlU
                        i+UVUPmKSsoqKAKqauoa5PqKAQAckwQ6m3rNOQAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMS0xMi0w
                        NlQxMTo0MDozNyswMzowMPAri5MAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjEtMTItMDZUMTE6NDA6
                        MzcrMDM6MDCBdjMvAAAAAElFTkSuQmCC" />
                        </svg>
                    </span>
                </div>
                <div class="main-container" id="authentication_username_id">
                    <span>Username</span>
                    <input type="text" class="authentication_username" value="${user}"></input>
                </div>
                <div class="main-container" id="authentication_password_id">
                    <span>Password</span>
                    <input type="password" class="authentication_password"></input>
                    <script type="text/javascript">
                        if(${isBrowserAuth} === true) {
                            document.getElementById("authentication_password_id").style.opacity = "0.6";
                            document.getElementsByClassName('authentication_password')[0].setAttribute("disabled", "disabled");
                            document.getElementById("authentication_username_id").style.opacity = "0.6";
                            document.getElementsByClassName('authentication_username')[0].setAttribute("disabled", "disabled");
                        } else {
                            document.getElementById("authentication_password_id").style.opacity = "100";
                            document.getElementsByClassName('authentication_password')[0].removeAttribute("disabled");
                            document.getElementById("authentication_username_id").style.opacity = "100";
                            document.getElementsByClassName('authentication_username')[0].removeAttribute("disabled");
                        }
                    
                    </script>
                </div>
                <div class="main-container" style="flex-direction: row; align-items: center;">
				    <input style="width: unset" id="attempt_browser_authentication_radio_id" class="attempt_browser_authentication_radio" type="radio" name="auth"></input> <label style="margin: unset !important;">Login using a browser</label>
                    <span 
                        title="Log into ALM Octane using a browser. You can use this method for non-SSO, SSO, and federated environments. Your login credentials are not saved between sessions, so you will have to re-enter them each time." 
                        style="margin: 0rem 0rem 0rem 0.5rem; cursor: pointer; display: flex;">
                        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="16px" height="16px" viewBox="0 0 16 16" enable-background="new 0 0 16 16" xml:space="preserve">  <image id="image0" width="16" height="16" x="0" y="0"
                            href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAACBjSFJN
                        AAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAkFBMVEX///9IjrdKkblMk7pM
                        k7pJj7hGjLZNlbtVnsFYosRZosVYosRKkrlMlbxUnsJZo8dSm8BGj7hQmsBTncI9hLBEjLZTnsNL
                        lbxAibRNmL9Ikrs5ga5EjrhJlb1Djrc/ibRBirU1e6k7gq87g7A2fKo2fKo/h7M/iLQ4fqxNlLtT
                        nMBapchZpMdPmb9JlLz///96MZqwAAAAKXRSTlMAW7Lo5pQWov3RtPLAFx5p9w7BuzDewxXdjQMK
                        zMwYERY4+v5fKObwSo7gz3IAAAABYktHRACIBR1IAAAAB3RJTUUH5QwGDigldgHFqwAAAFFJREFU
                        GNNjYCATMDIxa7KwsiEE2Dk4ubi1eBACvHwMDPzaAii6BIV0hJH5IqK6YuLIAhJ6klLIfGkZWTlU
                        i+UVUPmKSsoqKAKqauoa5PqKAQAckwQ6m3rNOQAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMS0xMi0w
                        NlQxMTo0MDozNyswMzowMPAri5MAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjEtMTItMDZUMTE6NDA6
                        MzcrMDM6MDCBdjMvAAAAAElFTkSuQmCC" />
                        </svg>
                    </span>
                </div>
                <script>
                    document.getElementById("attempt_authentication_radio_id").checked = ${!isBrowserAuth};
                    document.getElementById("attempt_browser_authentication_radio_id").checked = ${isBrowserAuth};
                </script>
                <hr>
                <div class="main-container" style="flex-direction: row;">
				    <button class="test_authentication_connection" style="margin: 0rem 0.5rem 0rem 0rem">Test connection</button>
                    <button class="clear_settings">Clear settings</button>
                </div>
                <span id="test_authentication_connection_successful" style="display: none"></span>
                <span id="authentication_workspace_unsuccessful" style="display: none"></span>
                <hr>
                <div class="main-container">
				    <button class="attempt_authentication">Authenticate</button>
                </div>
                <script src="${scriptUri}"></script>
			</body>
			</html>`;
    }

}
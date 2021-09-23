import * as vscode from 'vscode';
import { AlmOctaneAuthenticationProvider, AlmOctaneAuthenticationType } from '../auth/authentication-provider';
import { OctaneService } from '../octane/service/octane-service';
import { v4 as uuid } from 'uuid';

export class WelcomeViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'visual-studio-code-plugin-for-alm-octane.myWelcome';

    private view?: vscode.WebviewView;

    constructor(private readonly extensionUri: vscode.Uri, private readonly authenticationProvider: AlmOctaneAuthenticationProvider) {
        console.info('WelcomeViewProvider constructed');
    }

    public attemptAuthentication() {
        console.info('attemptAuthentication called.');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken,
    ) {
        console.info('WelcomeViewProvider.resolveWebviewView called');
        this.view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [
                this.extensionUri
            ]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'attemptAuthentication':
                    {
                        try {
                            const uri = vscode.workspace.getConfiguration('visual-studio-code-plugin-for-alm-octane');
                            await uri.update('server.uri', data.uri, true);
                            await uri.update('server.space', data.space, true);
                            await uri.update('server.workspace', data.workspace, true);
                            await uri.update('user.userName', data.user, true);
                            if (data.browser) {
                                try {
                                    await vscode.authentication.getSession(AlmOctaneAuthenticationProvider.type, ['default'], { createIfNone: true });
                                } catch (e: any) {
                                    vscode.window.showErrorMessage(e.message);
                                    throw e;
                                }
                            } else {
                                try {
                                    OctaneService.getInstance().storePasswordForAuthentication(data.password);
                                    // await this.authenticationProvider.createManualSession(data.password);
                                    await vscode.authentication.getSession(AlmOctaneAuthenticationProvider.type, ['default'], { createIfNone: true });
                                } catch (e: any) {
                                    vscode.window.showErrorMessage(e.message);
                                    throw e;
                                } finally {
                                    OctaneService.getInstance().storePasswordForAuthentication(undefined);
                                }
                            }
                        } catch (e) {
                            console.error('While creating session.', e);
                        }
                        break;
                    }
                case 'testConnection':
                    {
                        var authTestResult;
                        if (data.browser) {
                            authTestResult = await OctaneService.getInstance().testConnectionOnBrowserAuthentication(data.uri);
                        } else {
                            authTestResult = await OctaneService.getInstance().testAuthentication(data.uri, data.space, data.workspace, data.user, data.password, undefined, undefined);
                        }
                        webviewView.webview.postMessage({
                            type: 'testConnectionResponse',
                            authTestResult: authTestResult ? true : false
                        });
                        break;
                    }
                case 'changeInURL':
                    {
                        let url: string = data.url;
                        let regExp = url.match(/\?p=(\d+\/\d+)$/);
                        let space = regExp !== null ? regExp[1].split('/')[0] : '';
                        let workspace = regExp !== null ? regExp[1].split('/')[1] : '';
                        break;
                    }
            }
        });
    }

    getHtmlForWebview(webview: vscode.Webview): string {

        console.info('WelcomeViewProvider.getHtmlForWebview called');

        let uri: string | undefined = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.uri');
        if (uri && uri !== undefined) {
            uri = uri.endsWith('/') ? uri : uri + '/';
        }
        const space = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.space');
        const workspace = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.workspace');
        const user = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.user.userName');

        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'welcome-controller.js'));

        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'vscode.css'));
        const myStyle = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'my-css.css'));



        console.info('WelcomeViewProvider.getHtmlForWebview returning HTML');

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
                    <span>URL</span>
                    <input type="text" id="authentication_url_id" class="authentication_url" value="${uri}"></input>
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
				    <input style="width: unset" class="attempt_authentication_radio" type="radio" name="auth" checked></input> <label style="margin-top: 0.5rem;">Authenticate with username and password</label>
                </div>
                <div class="main-container" style="flex-direction: row; align-items: center;">
				    <input style="width: unset" class="attempt_browser_authentication_radio" type="radio" name="auth"></input> <label style="margin-top: 0.5rem;">Authenticate using browser</label>
                </div>
                <div class="main-container">
                    <span>Username</span>
                    <input type="text" class="authentication_username" value="${user}"></input>
                </div>
                <div class="main-container" id="authentication_password_id">
                    <span>Password</span>
                    <input type="password" class="authentication_password"></input>
                </div>
                <hr>
                <div class="main-container" style="flex-direction: row;">
				    <button class="test_authentication_connection" style="margin: 0rem 0.5rem 0rem 0rem">Test connection</button>
                    <button class="clear_settings">Clear settings</button>
                </div>
                <span id="test_authentication_connection_successful" style="display: none"></span>
                <hr>
                <div class="main-container">
				    <button class="attempt_authentication">Authenticate</button>
                </div>
                <script src="${scriptUri}"></script>
			</body>
			</html>`;
    }

}
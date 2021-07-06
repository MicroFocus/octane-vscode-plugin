import * as vscode from 'vscode';

export class MyTextEditor implements vscode.CustomTextEditorProvider {

    public static readonly viewType: string = 'alm-octane-entity';

    public constructor(
        private context: vscode.ExtensionContext
    ) { }

    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): void | Thenable<void> {

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        function updateWebview() {
            webviewPanel.webview.postMessage({
                type: 'update',
                text: document.getText(),
            });
        }
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
        	if (e.document.uri.toString() === document.uri.toString()) {
        		updateWebview();
        	}
        });
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(e => {
			console.log("e = ",e);
		});

        updateWebview();
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'vscode.css'));
        return `
		<!DOCTYPE html>
		<head>
            <link href="${styleVSCodeUri}" rel="stylesheet" />
		</head>
		<body>
			<input>
		</body>

	`;
    }

}
import * as vscode from 'vscode';

export class MyTextEditor implements vscode.CustomTextEditorProvider {

    public static readonly viewType: string = '';

    public constructor(
        private context: vscode.ExtensionContext
    ) {}

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
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `
		<!DOCTYPE html>
		<head>
		</head>
		<body>
			<input>
		</body>

	`;
    }

}
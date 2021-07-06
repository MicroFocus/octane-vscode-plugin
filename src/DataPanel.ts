import * as vscode from 'vscode';

export class DataPanelProvider implements vscode.CustomTextEditorProvider {

    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {

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
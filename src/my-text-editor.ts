import * as vscode from 'vscode';

export class MyTextEditor implements vscode.TextDocumentContentProvider {

    public static readonly viewType: string = 'myEditor';

    public constructor(
        private context: vscode.ExtensionContext
    ) { }

    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;
    provideTextDocumentContent(uri: vscode.Uri): string {
        const data = JSON.parse(uri.path);
        return "data";
    }

    

}
import * as vscode from 'vscode';
import { OctaneQuickPickItem } from '../octane/model/octane-quick-pick-item';

export class SearchProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {
		context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.mySearch.refreshEntry', () => {
			this.refresh();
		}));
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
        if (!element) {
            let history: OctaneQuickPickItem[] = this.context.workspaceState.get('visual-studio-code-plugin-for-alm-octane.quickPick.history', []);
            if (history.length) {
                return history.filter(h => h.searchString).map(h => new MySearchItem(h));
            }
        }
    }

    public refresh(): any {
        this._onDidChangeTreeData.fire(undefined);
    }

 }

 export class MySearchItem extends vscode.TreeItem {

    constructor(
        private item: OctaneQuickPickItem
    ) {
        super(item.searchString ?? '', vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('search-refresh');
        this.command = { command: 'visual-studio-code-plugin-for-alm-octane.quickPick', title: 'Rerun search', arguments: [this.item] };
    }

}
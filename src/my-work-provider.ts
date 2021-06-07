import * as vscode from 'vscode';
import { OctaneEntity, OctaneService } from './octane-service';

export abstract class MyWorkProvider implements vscode.TreeDataProvider<MyWorkItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;
    
    protected service: OctaneService;
    private user?: String;
    
    constructor() {
       this.service = OctaneService.getInstance();
    }

    getTreeItem(element: MyWorkItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: MyWorkItem): vscode.ProviderResult<MyWorkItem[]> {
        if (!element) {
            if (!this.service.isLoggedIn()) {
                return null;
            }
            return this.getRelevantEntities().map(e => this.getMyWorkItem(e));
        } 
    }

    abstract getRelevantEntities(): OctaneEntity[];

    getMyWorkItem(i: any): MyWorkItem {
        const item = new MyWorkItem(i.id + ' ' + i.name);
        item.id = i.id;
        return item;
    }

    public refresh(): any {
        this._onDidChangeTreeData.fire(undefined);
    }
}

export class MyWorkItem extends vscode.TreeItem {
    constructor(
        public readonly label: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
    }
}
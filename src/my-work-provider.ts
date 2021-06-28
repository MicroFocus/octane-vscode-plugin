import * as vscode from 'vscode';
import { MyMentionsProvider } from './mentions-provider';
import { OctaneEntity, OctaneService, Comment } from './octane-service';

export abstract class MyWorkProvider implements vscode.TreeDataProvider<MyWorkItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private user?: String;

    constructor(protected service: OctaneService) {
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
            return this.getRelevantEntities().then((r: OctaneEntity[]) => r.map((e: OctaneEntity) => this.getMyWorkItem(e)));
        }
    }

    abstract getRelevantEntities(): Promise<OctaneEntity[]>;

    getMyWorkItem(i: OctaneEntity): MyWorkItem {
        const item = new MyWorkItem(new MyWorkItemLabel(i));
        item.id = '' + i.id;
        item.entity = i;
        return item;
    }

    public refresh(): any {
        this._onDidChangeTreeData.fire(undefined);
    }

    resolveTreeItem(item: MyWorkItem, element: MyWorkItem, token: vscode.CancellationToken): vscode.ProviderResult<MyWorkItem> {
        if (item.entity) {
            item.tooltip = new vscode.MarkdownString(
                '**' + item.entity.id + '** ' + item.entity.name
                + '\n\n'
                + '| SP: ' + item.entity.storyPoints  + ' '
                + (item.entity.phase instanceof OctaneEntity ? '| Phase: ' + this.service.getPhaseLabel(item.entity.phase) + ' ' : '')
                + '| Owner: ' + (item.entity.owner ?? '-') + ' '
                + '| Detected by: ' + (item.entity.detectedBy ?? '-' ) + ' '
                + '| Severity: ' + (item.entity.severity?.split(/[\s.]+/).pop() ?? '-' ) + ' '
                + '\n\n'
                + '| Invested Hours: ' + (item.entity.investedHours ?? '-' ) + ' '
                + '| Remaining Hours: ' + (item.entity.remainingHours ?? '-' ) + ' '
                + '| Estimated Hours: ' + (item.entity.estimatedHours ?? '-' ) + ' '
            );
        }
        return item;
    }
}

export class MyWorkItem extends vscode.TreeItem {

    public entity?: OctaneEntity;

    constructor(
        public readonly label: vscode.TreeItemLabel
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
    }
}

export class MyWorkItemLabel implements vscode.TreeItemLabel {

    label: string;
    highlights?: [number, number][] | undefined;

    constructor(item: Comment | any) {
        if ((<Comment> item).getStrippedText) {
            this.label = item.id + ' ' + item.getStrippedText();
        } else {
            this.label = item.id + ' ' + item.name;
            // this.highlights = [[0, item.id.length]];
        }
    }

}
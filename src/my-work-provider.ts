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
        item.iconPath = this.getIconForEntity(i);
        return item;
    }

    private getIconForEntity(entity: OctaneEntity): vscode.Uri  {
        if (entity?.subtype) {
            if (entity?.subtype == 'defect')
                return vscode.Uri.file(`${__filename}/../../media/treeIcons/D.svg`);
            if (entity?.subtype == 'story')
                return vscode.Uri.file(`${__filename}/../../media/treeIcons/US.svg`);
            if (entity?.subtype == 'quality_story')
                return vscode.Uri.file(`${__filename}/../../media/treeIcons/QS.svg`);
            if (entity?.subtype == 'feature')
                return vscode.Uri.file(`${__filename}/../../media/treeIcons/F.svg`);
            if (entity?.subtype == 'scenario_test')
                return vscode.Uri.file(`${__filename}/../../media/treeIcons/BSC.svg`);
            if (entity?.subtype == 'test_manual')
                return vscode.Uri.file(`${__filename}/../../media/treeIcons/MT.svg`);
            if (entity?.subtype == 'auto_test')
                return vscode.Uri.file(`${__filename}/../../media/treeIcons/AT.svg`);
            if (entity?.subtype == 'gherkin_test')
                return vscode.Uri.file(`${__filename}/../../media/treeIcons/GT.svg`);
            if (entity?.subtype == 'test_suite')
                return vscode.Uri.file(`${__filename}/../../media/treeIcons/TS.svg`);
        }
        return vscode.Uri.file('');
    }

    public refresh(): any {
        this._onDidChangeTreeData.fire(undefined);
    }

    resolveTreeItem(item: MyWorkItem, element: MyWorkItem, token: vscode.CancellationToken): vscode.ProviderResult<MyWorkItem> {
        if (item.entity) {
            item.tooltip = new vscode.MarkdownString(
                '**' + item.entity.id + '** ' + (item.entity?.name ?? '' )
                + '\n\n'
                + (item.entity.type != 'test' && item.entity.type != 'comment' ? '| SP: ' + (item.entity.storyPoints ?? '-')  + ' ' : '')
                + (item.entity.phase instanceof OctaneEntity ? '| Phase: ' + (this.service.getPhaseLabel(item.entity.phase) ?? '-') + ' ' : '')
                + (item.entity.subtype == 'defect' ? '| Severity: ' + (item.entity.severity?.split(/[\s.]+/).pop() ?? '-' ) + ' ' : '')
                + '\n\n'
                + (item.entity.type != 'comment' ? '| Owner: ' + (item.entity.owner?.full_name ?? '-') + ' ' : '')
                + (item.entity.subtype == 'defect' ? '| Detected by: ' + (item.entity.detectedBy?.full_name ?? '-' ) + ' ' : '')
                + '| Auther: ' + (item.entity.author?.full_name ?? '-')+ ' '
                + '\n\n'
                + (item.entity.type != 'comment' && item.entity.type != 'test' ? '| Invested Hours: ' + (item.entity.investedHours ?? '-' ) + ' ' : '')
                + (item.entity.type != 'comment' && item.entity.type != 'test' ? '| Remaining Hours: ' + (item.entity.remainingHours ?? '-' ) + ' ' : '')
                + (item.entity.type != 'comment' && item.entity.type != 'test' ? '| Estimated Hours: ' + (item.entity.estimatedHours ?? '-' ) + ' ' : '')
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
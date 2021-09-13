import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { Comment } from "../octane/model/comment";
import { OctaneEntity } from "../octane/model/octane-entity";

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
        item.iconPath = MyWorkProvider.getIconForEntity(i);
        item.contextValue = i.subtype ?? i.type;
        return item;
    }

    public static getIconForEntity(entity: OctaneEntity): vscode.Uri {
        if (entity?.label) {
            return vscode.Uri.file(`${__filename}/../../../media/treeIcons/${entity.label}.svg`);
        }
        if (entity?.subtype === 'requirement_document') {
            return vscode.Uri.file(`${__filename}/../../../media/treeIcons/RD.svg`);
        }
        return vscode.Uri.file('');
    }

    public refresh(): any {
        this._onDidChangeTreeData.fire(undefined);
    }

    resolveTreeItem(item: MyWorkItem, element: MyWorkItem, token: vscode.CancellationToken): vscode.ProviderResult<MyWorkItem> {
        if (item.entity) {
            item.tooltip = new vscode.MarkdownString(
                '**' + item.entity.id + '** ' + (item.entity?.name ?? '')
                + '\n\n'
                + (item.entity.storyPoints  ? '| SP: ' + (item.entity.storyPoints ?? '-') + ' ' : '')
                + (item.entity.phase ? '| Phase: ' + (item.entity.phase.name ?? '-') + ' ' : '')
                + (item.entity.severity ? '| Severity: ' + (item.entity.severity?.split(/[\s.]+/).pop() ?? '-') + ' ' : '')
                + '\n\n'
                + (item.entity.owner ? '| Owner: ' + (item.entity.owner?.fullName ?? '-') + ' ' : '')
                + (item.entity.detectedBy ? '| Detected by: ' + (item.entity.detectedBy?.fullName ?? '-') + ' ' : '')
                + '| Author: ' + (item.entity.author?.fullName ?? '-') + ' '
                + '\n\n'
                + (item.entity.investedHours ? '| Invested Hours: ' + (item.entity.investedHours ?? '-') + ' ' : '')
                + (item.entity.remainingHours ? '| Remaining Hours: ' + (item.entity.remainingHours ?? '-') + ' ' : '')
                + (item.entity.estimatedHours ? '| Estimated Hours: ' + (item.entity.estimatedHours ?? '-') + ' ' : '')
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
        this.command = { command: 'visual-studio-code-plugin-for-alm-octane.details', title: 'Details', arguments: [this] };
    }
}

export class MyWorkItemLabel implements vscode.TreeItemLabel {

    label: string;
    highlights?: [number, number][] | undefined;

    constructor(item: Comment | any) {
        if ((<Comment>item).getStrippedText) {
            this.label = item.id + ' ' + item.getStrippedText();
        } else {
            this.label = item.id + ' ' + item.name;
            // this.highlights = [[0, item.id.length]];
        }
    }

}
import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { Comment } from "../octane/model/comment";
import { OctaneEntity } from "../octane/model/octane-entity";
import { OctaneEntityHolder } from '../octane/model/octane-entity-holder';
import { OctaneEntityEditorProvider } from '../details/octane-editor';

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
        const item = new MyWorkItem(i);
        
        return item;
    }

    public static getIconForEntity(entity: OctaneEntity): vscode.Uri {
        if (entity?.label) {
            return vscode.Uri.file(`${__filename}/../../../media/treeIcons/${entity.label}.svg`);
        }
        if (entity?.subtype === 'requirement_document') {
            return vscode.Uri.file(`${__filename}/../../../media/treeIcons/RD.svg`);
        }
        if (entity?.type === 'comment') {
            return vscode.Uri.file(`${__filename}/../../../media/treeIcons/M.svg`);
        }
        if (entity?.type === 'task') {
            return vscode.Uri.file(`${__filename}/../../../media/treeIcons/T.svg`);
        }
        if (entity?.type === 'bdd_spec') {
            return vscode.Uri.file(`${__filename}/../../../media/treeIcons/BSP.svg`);
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

export class MyWorkItem extends vscode.TreeItem implements OctaneEntityHolder {

    public entity?: OctaneEntity;

    constructor(
        entity: OctaneEntity
    ) {
        super(new MyWorkItemLabel(entity), vscode.TreeItemCollapsibleState.None);
        this.id = '' + entity.id;
        this.entity = entity;
        this.iconPath = MyWorkProvider.getIconForEntity(entity);
        this.contextValue = entity.subtype && entity.subtype !== '' ? entity.subtype : entity.type;
        this.command = { command: 'vscode.openWith', title: 'Details', arguments: [vscode.Uri.parse(`octane:///octane/${entity.type}/${entity.subtype}/${entity.id}`), OctaneEntityEditorProvider.viewType] };
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
        }
        this.highlights = [[0, item.id.length]];
    }

}
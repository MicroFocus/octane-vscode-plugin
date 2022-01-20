import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { getLogger } from 'log4js';
import { OctaneQuickPickItem } from '../octane/model/octane-quick-pick-item';
import { OctaneEntity } from '../octane/model/octane-entity';
import { debounce } from 'ts-debounce';
import { OctaneEntityEditorProvider } from '../details/octane-editor';
import * as entitiesInMyWork from '../configurations/entities-in-my-work.json';

export function registerCommand(context: ExtensionContext) {
	const logger = getLogger('vs');
    context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.quickPick', async (value: OctaneQuickPickItem) => {

		let service = OctaneService.getInstance();

		const quickPick = vscode.window.createQuickPick();
		quickPick.title = 'Search in Octane';
		quickPick.placeholder = 'Search term';
		quickPick.items = [];
		let history: OctaneQuickPickItem[] = context.workspaceState.get('visual-studio-code-plugin-for-alm-octane.quickPick.history', []);
		logger.debug('history: ', history);

		quickPick.onDidChangeSelection(async selection => {
			history = await saveHistoryState(quickPick, history);
			let item: OctaneQuickPickItem = selection[0] as OctaneQuickPickItem;
			if (item) {
				if (item.entity === undefined) {
					quickPick.value = item.searchString ?? item.label;
					return;
				}
				try {
					if (item.entity.type && !entitiesInMyWork.includes(item.entity.type)) {
						await vscode.env.openExternal(service.getBrowserUri(item.entity));
					} else {
						await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.parse(`octane:///octane/${item.entity.type}/${item.entity.subtype}/${item.entity.id}`), OctaneEntityEditorProvider.viewType);
					}
				} catch (e) {
					logger.error(e);
				}
			}
		});

		if (value) {
			quickPick.value = value.searchString ?? '';
		} else {
			quickPick.items = history;
		}

		let quickPickChangedValue = async function (e: string) {
			let promises = [];
			promises.push(OctaneService.getInstance().globalSearchWorkItems('defect', e));
			promises.push(OctaneService.getInstance().globalSearchWorkItems('story', e));
			promises.push(OctaneService.getInstance().globalSearchWorkItems('quality_story', e));
			promises.push(OctaneService.getInstance().globalSearchWorkItems('epic', e));
			promises.push(OctaneService.getInstance().globalSearchWorkItems('feature', e));
			promises.push(OctaneService.getInstance().globalSearchTasks(e));
			promises.push(OctaneService.getInstance().globalSearchRequirements(e));
			promises.push(OctaneService.getInstance().globalSearchTests(e));

			let items: OctaneQuickPickItem[] = [];
			quickPick.busy = true;
			const results = await Promise.all(promises);
			results.map(r => items.push(...r.map((oe: OctaneEntity) => new OctaneQuickPickItem(oe, e, false))));
			logger.debug('setting items to', items);
			if (items.length === 0) {
				quickPick.items = [
					new OctaneQuickPickItem(undefined, 'No results found', true)
				];
			} else {
				quickPick.items = items;
			}
			quickPick.busy = false;
		};
		const debouncedFunction = debounce(quickPickChangedValue, 100);

		quickPick.onDidChangeValue(async e => await debouncedFunction(e));
		quickPick.onDidHide(() => quickPick.dispose());
		// quickPick.buttons = [{ iconPath: new vscode.ThemeIcon('request-changes') }];
		quickPick.show();
	}));

	async function saveHistoryState(quickPick: vscode.QuickPick<vscode.QuickPickItem>, history: OctaneQuickPickItem[]) {
		if (quickPick.value) {
			history = [new OctaneQuickPickItem(undefined, quickPick.value, false)].concat(history.filter(e => e.searchString !== quickPick.value)).slice(0, 5);
			await context.workspaceState.update('visual-studio-code-plugin-for-alm-octane.quickPick.history', history);
			vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.mySearch.refreshEntry');
		}
		return history;
	}
}
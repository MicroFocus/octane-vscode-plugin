/*
 * Copyright 2021-2023 Open Text.
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import { OctaneService } from '../octane/service/octane-service';
import { getLogger } from 'log4js';
import { OctaneQuickPickItem } from '../octane/model/octane-quick-pick-item';
import { OctaneEntity } from '../octane/model/octane-entity';
import { debounce } from 'ts-debounce';
import { OctaneEntityEditorProvider } from '../details/octane-editor';
import * as entitiesInMyWork from '../configurations/entities-in-my-work.json';
import { log } from "console";
import { ErrorHandler } from "../octane/service/error-handler";

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
					let entityWithTypeOrSubType = item.entity.subtype ? item.entity.subtype : item.entity.type;
					if (entityWithTypeOrSubType && !entitiesInMyWork.includes(entityWithTypeOrSubType)) {
						try {
							await vscode.env.openExternal(service.getBrowserUri(item.entity));
						} catch (e: any) {
							logger.error('While opening entity externally ', ErrorHandler.handle(e));
						}
					} else {
						await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.parse(`octane:///octane/${item.entity.type}/${item.entity.subtype}/${item.entity.id}`), OctaneEntityEditorProvider.viewType);
					}
				} catch (e: any) {
					logger.error(ErrorHandler.handle(e));
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
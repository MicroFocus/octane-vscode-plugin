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
import { MyWorkItem } from "../treeview/my-work-provider";
import { OctaneEntityEditorProvider } from "../details/octane-editor";

export function register(context: ExtensionContext) {

	
	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.openActiveItem', async () => {
		let myActiveItem = context.workspaceState.get('activeItem', undefined) as MyWorkItem | undefined;
		if (myActiveItem?.entity) {
			await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.parse(`octane:///octane/${myActiveItem.entity.type}/${myActiveItem.entity.subtype}/${myActiveItem.entity.id}`), OctaneEntityEditorProvider.viewType);
		}
	}));

	const entityStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 102);
	entityStatusBarItem.text = '$(clock) No active item';
	entityStatusBarItem.command = 'visual-studio-code-plugin-for-alm-octane.openActiveItem';
	entityStatusBarItem.show();
	context.subscriptions.push(entityStatusBarItem);

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.startWork', async (e: MyWorkItem) => {
		entityStatusBarItem.text = `$(clock) ${e.entity?.label} ${e.id}`;
		await context.workspaceState.update('activeItem', e);
		clearActiveItemStatusBarItem.show();
		copyCommitMessageStatusBarItem.show();
	}));

	const clearActiveItemStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	clearActiveItemStatusBarItem.text = '$(stop-circle)';
	clearActiveItemStatusBarItem.command = 'visual-studio-code-plugin-for-alm-octane.endWork';
	clearActiveItemStatusBarItem.tooltip = "Stop work";
	context.subscriptions.push(clearActiveItemStatusBarItem);

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.endWork', async () => {
		entityStatusBarItem.text = `$(clock) No Active Item`;
		await context.workspaceState.update('activeItem', undefined);
		clearActiveItemStatusBarItem.hide();
		copyCommitMessageStatusBarItem.hide();
	}));

	const copyCommitMessageStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);
	copyCommitMessageStatusBarItem.text = '$(git-commit)';
	copyCommitMessageStatusBarItem.tooltip = 'Copy commit message';
	copyCommitMessageStatusBarItem.command = 'visual-studio-code-plugin-for-alm-octane.copyCommitMessageClick';
	context.subscriptions.push(copyCommitMessageStatusBarItem);
	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.copyCommitMessageClick', async () => {
		let myActiveItem = context.workspaceState.get('activeItem', undefined) as MyWorkItem | undefined;
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.commitMessage', myActiveItem);
	}));

	let storedActiveItem = context.workspaceState.get('activeItem', undefined);
	if (storedActiveItem !== undefined) {
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.startWork', storedActiveItem);
	}
	
}
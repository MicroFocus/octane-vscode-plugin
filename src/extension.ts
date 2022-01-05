// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { BacklogProvider } from './treeview/backlog-provider';
import { OctaneService } from './octane/service/octane-service';
import { MyMentionsProvider } from './treeview/mentions-provider';
import { MyTestsProvider } from './treeview/tests-provider';
import { MyFeatureProvider } from './treeview/feature-provider';
import { MyRequirementsProvider } from './treeview/requirements-provider';
import { OctaneEntityEditorProvider } from './details/octane-editor';
import { AlmOctaneAuthenticationProvider } from './auth/authentication-provider';
import { WelcomeViewProvider } from './treeview/welcome';
import { SearchProvider } from './treeview/search-provider';
import { OctaneEntity } from './octane/model/octane-entity';
import { OctaneQuickPickItem } from './octane/model/octane-quick-pick-item';
import { MyWorkItem } from './treeview/my-work-provider';
import { MyTasksProvider } from './treeview/tasks-provider';
import { MyTestRunsProvider } from './treeview/test-runs-provider';
import { debounce } from 'ts-debounce';
import { getLogger } from 'log4js';
import { Task } from './octane/model/task';
import { registerCommand as registerCopyCommitMessageCommand } from './commands/copy-commit-message';
import { registerCommand as registerOpenInBrowserCommand } from './commands/open-in-browser';
import { registerCommand as registerDownloadTestCommand } from './commands/download-test';
import { initializeLog } from './log/log';
import { setVisibilityRules } from './treeview/visibility-rules';

export async function activate(context: vscode.ExtensionContext) {


	initializeLog(context);
	const logger = getLogger('vs');

	setVisibilityRules();

	const service = OctaneService.getInstance();

	const authProvider = new AlmOctaneAuthenticationProvider(context);
	context.subscriptions.push(authProvider);
	authProvider.onDidChangeSessions(async e => {
		logger.info('Received session change');
		if (e.removed !== undefined) {
			vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.endWork');
			vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.details.closeAll');
			await context.workspaceState.update('visual-studio-code-plugin-for-alm-octane.quickPick.history', []);
		}
		await service.initialize();
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');
	});

	await service.initialize();

	registerCopyCommitMessageCommand(context);

	context.subscriptions.push(vscode.window.registerWebviewViewProvider('visual-studio-code-plugin-for-alm-octane.myWelcome', new WelcomeViewProvider(context, authProvider)));

	OctaneEntityEditorProvider.register(context);

	const myBacklogProvider = new BacklogProvider(context, service, 'visual-studio-code-plugin-for-alm-octane.myBacklog.refreshEntry');
	vscode.window.registerTreeDataProvider('myBacklog', myBacklogProvider);

	const myTestsProvider = new MyTestsProvider(context, service, 'visual-studio-code-plugin-for-alm-octane.myTests.refreshEntry');
	vscode.window.registerTreeDataProvider('myTests', myTestsProvider);

	const myTestRunsProvider = new MyTestRunsProvider(context, service, 'visual-studio-code-plugin-for-alm-octane.myTestRuns.refreshEntry');
	vscode.window.registerTreeDataProvider('myTestRuns', myTestRunsProvider);

	const myFeaturesProvider = new MyFeatureProvider(context, service, 'visual-studio-code-plugin-for-alm-octane.myFeatures.refreshEntry');
	vscode.window.registerTreeDataProvider('myFeatures', myFeaturesProvider);

	const myMentionsProvider = new MyMentionsProvider(context, service, 'visual-studio-code-plugin-for-alm-octane.myMentions.refreshEntry');
	vscode.window.registerTreeDataProvider('myMentions', myMentionsProvider);

	const myRequirementsProvider = new MyRequirementsProvider(context, service, 'visual-studio-code-plugin-for-alm-octane.myRequirements.refreshEntry');
	vscode.window.registerTreeDataProvider('myRequirements', myRequirementsProvider);

	const myTasksProvider = new MyTasksProvider(context, service, 'visual-studio-code-plugin-for-alm-octane.myTasks.refreshEntry');
	vscode.window.registerTreeDataProvider('myTasks', myTasksProvider);

	const mySearchProvider = new SearchProvider(context);
	vscode.window.registerTreeDataProvider('visual-studio-code-plugin-for-alm-octane.mySearch', mySearchProvider);

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.refreshAll', () => {
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myBacklog.refreshEntry');
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myTests.refreshEntry');
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myMentions.refreshEntry');
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myFeatures.refreshEntry');
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myRequirements.refreshEntry');
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myWelcome.refreshEntry');
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myTasks.refreshEntry');
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myTestRuns.refreshEntry');
	}));

	registerOpenInBrowserCommand(context);

	registerDownloadTestCommand(context);

	{
		context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.quickPick', async (value: OctaneQuickPickItem) => {
			const quickPick = vscode.window.createQuickPick();
			quickPick.title = 'Search in Octane';
			quickPick.placeholder = 'Search term';
			quickPick.items = [];
			let history: OctaneQuickPickItem[] = context.workspaceState.get('visual-studio-code-plugin-for-alm-octane.quickPick.history', []);
			logger.debug('history: ', history);

			quickPick.onDidChangeSelection(async selection => {
				if (quickPick.value && history.find(e => e.searchString === quickPick.value) === undefined) {
					history = [new OctaneQuickPickItem(undefined, quickPick.value, false)].concat(history).slice(0, 5);
					await context.workspaceState.update('visual-studio-code-plugin-for-alm-octane.quickPick.history', history);
					vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.mySearch.refreshEntry');
				}
				let item: OctaneQuickPickItem = selection[0] as OctaneQuickPickItem;
				if (item) {
					if (item.entity === undefined) {
						quickPick.value = item.searchString ?? item.label;
						return;
					}
					try {
						if (item.entity.type && OctaneService.entitiesToOpenExternally.includes(item.entity.type)) {
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


	}

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.details', async (e: MyWorkItem) => {
		if (e.command && e.command.arguments) {
			await vscode.commands.executeCommand(e.command.command, e.command.arguments[0], e.command.arguments[1]);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.parentDetails', async (e: MyWorkItem) => {
		if (e.entity && e.entity instanceof Task) {
			let task = e.entity as Task;
			let story = task.story;
			if (!story) {
				logger.warn(`No story found for task: ${task.id}`);
				return;
			}
			await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.parse(`octane:///octane/${story.type}/${story.subtype}/${story.id}`), OctaneEntityEditorProvider.viewType);
		}
	}));


	let myActiveItem: MyWorkItem | undefined;
	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.openActiveItem', async () => {
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
		myActiveItem = e;
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
		myActiveItem = undefined;
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
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.commitMessage', myActiveItem);
	}));

	let storedActiveItem = context.workspaceState.get('activeItem', undefined);
	if (storedActiveItem !== undefined) {
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.startWork', storedActiveItem);
	}

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.dismissItem', async (e: MyWorkItem) => {
		if (e.entity) {
			await service.dismissFromMyWork(e.entity);
			if (myActiveItem !== undefined && e.entity.id === myActiveItem.entity?.id && e.entity.type === myActiveItem.entity?.type) {
				vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.endWork');
			}
			vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');
		}
	}));

	vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');

}



// this method is called when your extension is deactivated
export function deactivate() {
	vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.endWork');
	vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.details.closeAll');
}

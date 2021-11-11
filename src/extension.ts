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
import * as path from 'path';
import * as fs from 'fs';
import { debounce } from 'ts-debounce';
import { TextEncoder } from 'util';
import { configure, getLogger, Appender } from 'log4js';
import { OctaneEntityHolder } from './octane/model/octane-entity-holder';

export async function activate(context: vscode.ExtensionContext) {

	let logAppender: Appender = {
		type: 'dateFile',
		filename: `${context.logUri.path}/vs.log`,
		compress: true,
		alwaysIncludePattern: true
	};
	try {
		fs.accessSync(context.logUri.path, fs.constants.W_OK);
		console.info('Log dir is writeable.');
	} catch (error) {
		console.warn('Log dir is not writeable.');
		logAppender = {
			type: 'console'
		};
	}

	configure({
		appenders: { vs: logAppender },
		categories: { default: { appenders: ['vs'], level: 'debug' } }
	});

	const logger = getLogger('vs');

	const service = OctaneService.getInstance();
	const authProvider = new AlmOctaneAuthenticationProvider(context);
	context.subscriptions.push(authProvider);

	{
		let saveLoginData = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.saveLoginData', async (loginData) => {
			if (loginData) {
				await context.workspaceState.update('loginData', loginData);
			}
		});
		context.subscriptions.push(saveLoginData);
	}

	{
		let getLoginData = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.getLoginData', () => {
			let value: any = context.workspaceState.get('loginData');
			if (value) {
				return value;
			}
		});
		context.subscriptions.push(getLoginData);
	}

	{
		let setFields = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.setFields', async (data, entityType) => {
			if (data.fields) {
				logger.debug(data);
				await context.workspaceState.update(`visibleFields-${entityType}`,
					JSON.stringify(data)
				);
			}
		});
		context.subscriptions.push(setFields);
	}

	{
		let getFields = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.getFields', (entityType) => {
			if (entityType) {
				let value: any = context.workspaceState.get(`visibleFields-${entityType}`);
				if (value) {
					value = JSON.parse(value);
					if (value && value.fields) {
						return value.fields;
					}
				}
			}
			return;
		});
		context.subscriptions.push(getFields);
	}

	await service.initialize();

	authProvider.onDidChangeSessions(async e => {
		logger.info('Received session change', e);
		if (e.removed !== undefined) {
			vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.endWork');
			await context.workspaceState.update('visual-studio-code-plugin-for-alm-octane.quickPick.history', []);
		}
		await service.initialize();
		await vscode.authentication.getSession(AlmOctaneAuthenticationProvider.type, ['default'], { createIfNone: false });
	});
	// vscode.authentication.onDidChangeSessions(async e => {
	// 	logger.info('Received session change', e);
	// 	if (e.provider && e.provider.id === AlmOctaneAuthenticationProvider.type) {
	// 		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.endWork');
	// 		await service.initialize();
	// 		await vscode.authentication.getSession(AlmOctaneAuthenticationProvider.type, ['default'], { createIfNone: false });
	// 	}
	// });

	const welcomeViewProvider = new WelcomeViewProvider(context.extensionUri, authProvider);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider('visual-studio-code-plugin-for-alm-octane.myWelcome', welcomeViewProvider));
	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myWelcome.refreshEntry', () => {
		welcomeViewProvider.refresh();
	}));


	context.subscriptions.push(OctaneEntityEditorProvider.register(context));

	const myBacklogProvider = new BacklogProvider(service);
	vscode.window.registerTreeDataProvider('myBacklog', myBacklogProvider);

	const myTestsProvider = new MyTestsProvider(service);
	vscode.window.registerTreeDataProvider('myTests', myTestsProvider);

	const myTestRunsProvider = new MyTestRunsProvider(service);
	vscode.window.registerTreeDataProvider('myTestRuns', myTestRunsProvider);

	const myFeaturesProvider = new MyFeatureProvider(service);
	vscode.window.registerTreeDataProvider('myFeatures', myFeaturesProvider);

	const myMentionsProvider = new MyMentionsProvider(service);
	vscode.window.registerTreeDataProvider('myMentions', myMentionsProvider);

	const myRequirementsProvider = new MyRequirementsProvider(service);
	vscode.window.registerTreeDataProvider('myRequirements', myRequirementsProvider);

	const myTasksProvider = new MyTasksProvider(service);
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
	{
		let refreshCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myBacklog.refreshEntry', () => {
			myBacklogProvider.refresh();
		});
		context.subscriptions.push(refreshCommand);
	}

	{
		let refreshCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myTests.refreshEntry', () => {
			myTestsProvider.refresh();
		});
		context.subscriptions.push(refreshCommand);
	}

	{
		let refreshCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myFeatures.refreshEntry', () => {
			myFeaturesProvider.refresh();
		});
		context.subscriptions.push(refreshCommand);
	}

	{
		let refreshCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myMentions.refreshEntry', () => {
			myMentionsProvider.refresh();
		});
		context.subscriptions.push(refreshCommand);
	}

	{
		let refreshCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myRequirements.refreshEntry', () => {
			myRequirementsProvider.refresh();
		});
		context.subscriptions.push(refreshCommand);
	}

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myTasks.refreshEntry', () => {
		myTasksProvider.refresh();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myTestRuns.refreshEntry', () => {
		myTestRunsProvider.refresh();
	}));

	{
		let commitMessageCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.commitMessage', async (e: MyWorkItem) => {
			await vscode.env.clipboard.writeText(`${e.entity?.subtype ?? e.entity?.type} #${e.id}: `);
			vscode.window.showInformationMessage('Commit message copied to clipboard.');
		});
		context.subscriptions.push(commitMessageCommand);
	}

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.openInBrowser', async (e: OctaneEntityHolder) => {
		await vscode.env.openExternal(service.getBrowserUri(e.entity));
	}));

	{
		let downloadTestCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myTests.download', async (e: MyWorkItem) => {
			logger.info('visual-studio-code-plugin-for-alm-octane.myTests.download called', e);

			if (e.entity) {
				const script = await service.downloadScriptForTest(e.entity);
				if (vscode === undefined || vscode.workspace === undefined || vscode.workspace.workspaceFolders === undefined || vscode.workspace.workspaceFolders[0] === undefined) {
					vscode.window.showErrorMessage('No workspace opened. Can not save test script.');
					return;
				}

				let newFile = vscode.Uri.parse(path.join(vscode.workspace.workspaceFolders[0].uri.path, `${e.entity.name}_${e.entity.id}.feature`));
				try {
					fs.accessSync(vscode.workspace.workspaceFolders[0].uri.path, fs.constants.W_OK);
				} catch (error) {
					logger.error('workspace folder is not writabel', error);
					newFile = vscode.Uri.parse(`file://${e.entity.name}_${e.entity.id}.feature`);
				}

				const fileInfos = await vscode.window.showSaveDialog({ defaultUri: newFile });
				if (fileInfos) {
					try {
						await vscode.workspace.fs.writeFile(vscode.Uri.file(fileInfos.path), new TextEncoder().encode(`${script}`));
						try {
							logger.log(`Script saved to: ${fileInfos.path}`);
							await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fileInfos.path));
						} catch (e) {
							logger.error(e);
						}
						vscode.window.showInformationMessage('Script saved.');
					} catch (error) {
						logger.error('While saving script: ', e);
						vscode.window.showErrorMessage('Access error occurred while saving script.');
					}

				}
			}
		});
		context.subscriptions.push(downloadTestCommand);
	}
	{
		context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.quickPick', async (value: OctaneQuickPickItem) => {
			const quickPick = vscode.window.createQuickPick();
			quickPick.items = [];
			let history: OctaneQuickPickItem[] = context.workspaceState.get('visual-studio-code-plugin-for-alm-octane.quickPick.history', []);
			logger.info('history: ', history);

			quickPick.onDidChangeSelection(async selection => {
				if (quickPick.value && history.find(e => e.searchString === quickPick.value) === undefined) {
					history = [new OctaneQuickPickItem(undefined, quickPick.value)].concat(history).slice(0, 5);
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
						if (item.entity.type && entitiesToOpenExternally.includes(item.entity.type)) {
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
				// quickPick.items = [value];
				// quickPick.selectedItems = [value];
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
				promises.push(OctaneService.getInstance().globalSearchRequirements(e));
				promises.push(OctaneService.getInstance().globalSearchTests(e));

				let items: OctaneQuickPickItem[] = [];
				const results = await Promise.all(promises);
				results.map(r => items.push(...r.map((oe: OctaneEntity) => new OctaneQuickPickItem(oe, e))));
				logger.debug('setting items to', items);
				quickPick.items = items;
			};
			const debouncedFunction = debounce(quickPickChangedValue, 100);

			quickPick.onDidChangeValue(async e => await debouncedFunction(e));
			quickPick.onDidHide(() => quickPick.dispose());
			// quickPick.buttons = [{ iconPath: new vscode.ThemeIcon('request-changes') }];
			quickPick.show();
		}));


	}

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async e => {
		if (e.affectsConfiguration('visual-studio-code-plugin-for-alm-octane')) {
			await service.initialize();
			// await vscode.authentication.getSession(AlmOctaneAuthenticationProvider.type, ['default'], { createIfNone: false });
			vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.details', async (e: MyWorkItem) => {
		if (e.entity) {
			await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.parse(`octane:///octane/${e.entity.type}/${e.entity.subtype}/${e.entity.id}`), OctaneEntityEditorProvider.viewType);
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
		clearActiveItemStatusBarItem.hide();
		copyCommitMessageStatusBarItem.hide();
	}));

	const copyCommitMessageStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);
	copyCommitMessageStatusBarItem.text = '$(git-commit)';
	copyCommitMessageStatusBarItem.tooltip = 'Copy commit message';
	copyCommitMessageStatusBarItem.command =  'visual-studio-code-plugin-for-alm-octane.copyCommitMessageClick';
	context.subscriptions.push(copyCommitMessageStatusBarItem);
	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.copyCommitMessageClick', async () => {
		vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.commitMessage', myActiveItem);
	}));

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

	const entitiesToOpenExternally = [
		'epic',
		'test_suite',
		'test_automated'
	];
}



// this method is called when your extension is deactivated
export function deactivate() { }

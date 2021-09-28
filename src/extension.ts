// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { BacklogProvider } from './treeview/backlog-provider';
import { OctaneService } from './octane/service/octane-service';
import { MyMentionsProvider } from './treeview/mentions-provider';
import { MyTestsProvider } from './treeview/tests-provider';
import { MyFeatureProvider } from './treeview/feature-provider';
import { MyRequirementsProvider } from './treeview/requirements-provider';
import { OctaneWebview } from './details/octane-webview';
import { AlmOctaneAuthenticationProvider } from './auth/authentication-provider';
import { WelcomeViewProvider } from './treeview/welcome';
import { OctaneEntity } from './octane/model/octane-entity';
import { OctaneQuickPickItem } from './octane/model/octane-quick-pick-item';
import { MyWorkItem } from './treeview/my-work-provider';
import { MyTasksProvider } from './treeview/tasks-provider';
import { MyTestRunsProvider } from './treeview/test-runs-provider';
import * as path from 'path';
import * as fs from 'fs';
import { debounce } from "ts-debounce";
import { STATUS_CODES } from 'http';

export async function activate(context: vscode.ExtensionContext) {

	const service = OctaneService.getInstance();
	const authProvider = new AlmOctaneAuthenticationProvider(context);
	context.subscriptions.push(authProvider);

	{
		const myOctaneWebview = new OctaneWebview(service);
	}

	{
		let saveLoginData = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.saveLoginData', async (loginData) => {
			if (loginData) {
				await context.workspaceState.update("loginData", loginData);
			}
		});
		context.subscriptions.push(saveLoginData);
	}

	{
		let getLoginData = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.getLoginData', () => {
			let value: any = context.workspaceState.get("loginData");
			if (value) {
				return value;
			}
		});
		context.subscriptions.push(getLoginData);
	}

	{
		let setFilterSelection = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.setFilterSelection', async (data) => {
			if (data.filterName) {
				await context.workspaceState.update(data.filterName, data);
			}
		});
		context.subscriptions.push(setFilterSelection);
	}

	{
		let getFilterSelection = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.getFilterSelection', (key) => {
			if (key) {
				let value: any = context.workspaceState.get(key);
				if (value) {
					return value.message;
				}
			}
			return false;
		});
		context.subscriptions.push(getFilterSelection);
	}

	vscode.authentication.onDidChangeSessions(async e => {
		console.info('Received session change', e);
		if (e.provider && e.provider.id === AlmOctaneAuthenticationProvider.type) {
			await service.initialize();
			await vscode.authentication.getSession(AlmOctaneAuthenticationProvider.type, ['default'], { createIfNone: false });
		}
	});

	await service.initialize();

	const welcomeViewProvider = new WelcomeViewProvider(context.extensionUri, authProvider);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider('visual-studio-code-plugin-for-alm-octane.myWelcome', welcomeViewProvider));
	context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myWelcome.refreshEntry', () => {
		welcomeViewProvider.refresh();
	}));


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

	{
		let downloadTestCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.myTests.download', async (e: MyWorkItem) => {
			console.info('visual-studio-code-plugin-for-alm-octane.myTests.download called', e);

			if (e.entity) {
				const script = await service.downloadScriptForTest(e.entity);
				if (vscode === undefined || vscode.workspace === undefined || vscode.workspace.workspaceFolders === undefined) {
					vscode.window.showErrorMessage('No workspace opened. Can not save test script.');
					return;
				}

				const newFile = vscode.Uri.parse(path.join(vscode.workspace.workspaceFolders[0].uri.path, `${e.entity.name}_${e.entity.id}.feature`));
				const fileInfos = await vscode.window.showSaveDialog({ defaultUri: newFile });
				if (fileInfos) {
					fs.writeFileSync(fileInfos.path, `${script}`, 'utf8');
					try {
						await vscode.workspace.openTextDocument(fileInfos.path);
					} catch (e) {
						console.error(e);
					}
					vscode.window.showInformationMessage('Script saved.');
				}
			}
		});
		context.subscriptions.push(downloadTestCommand);
	}

	{
		context.subscriptions.push(vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.quickPick', async () => {
			const quickPick = vscode.window.createQuickPick();
			quickPick.items = [];
			quickPick.onDidChangeSelection(async selection => {
				if (selection[0]) {
					try {
						await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.details', selection[0]);
					} catch (e) {
						console.error(e);
					}
				}
			});

			let quickPickChangedValue = async function (e: string) {
				let promises = [];
				promises.push(OctaneService.getInstance().globalSearchWorkItems('defect', e));
				promises.push(OctaneService.getInstance().globalSearchWorkItems('story', e));
				promises.push(OctaneService.getInstance().globalSearchWorkItems('quality_story', e));
				promises.push(OctaneService.getInstance().globalSearchRequirements(e));
				promises.push(OctaneService.getInstance().globalSearchTests(e));

				let items: OctaneQuickPickItem[] = [];
				const results = await Promise.all(promises);
				results.map(r => items.push(...r.map((oe: OctaneEntity) => new OctaneQuickPickItem(oe, e))));
				console.debug('setting items to', items);
				quickPick.items = items;
			};
			const debouncedFunction = debounce(quickPickChangedValue, 100);

			quickPick.onDidChangeValue(async e => await debouncedFunction(e));
			quickPick.onDidHide(() => quickPick.dispose());
			// quickPick.buttons = [{ iconPath: new vscode.ThemeIcon('request-changes') }];
			quickPick.show();
		}));


	}
	{
		context.subscriptions.push(OctaneWebview.register(context));
	}

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async e => {
		if (e.affectsConfiguration('visual-studio-code-plugin-for-alm-octane')) {
			await service.initialize();
			// await vscode.authentication.getSession(AlmOctaneAuthenticationProvider.type, ['default'], { createIfNone: false });
			vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');
		}
	}));

	vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');

}



// this method is called when your extension is deactivated
export function deactivate() { }

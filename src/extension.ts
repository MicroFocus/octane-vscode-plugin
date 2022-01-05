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
import { MyTasksProvider } from './treeview/tasks-provider';
import { MyTestRunsProvider } from './treeview/test-runs-provider';
import { getLogger } from 'log4js';
import { registerCommand as registerCopyCommitMessageCommand } from './commands/copy-commit-message';
import { registerCommand as registerOpenInBrowserCommand } from './commands/open-in-browser';
import { registerCommand as registerDownloadTestCommand } from './commands/download-test';
import { registerCommand as registerGlobalSearchCommand } from './commands/global-search';
import { registerCommand as registerOpenDetailsCommands } from './commands/open-details';
import { registerCommand as registerDismissItemCommand } from './commands/dismiss-item';
import { register as registerActiveItemCommands } from './commands/active-item';
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

	registerCopyCommitMessageCommand(context);

	registerOpenInBrowserCommand(context);

	registerDownloadTestCommand(context);

	registerGlobalSearchCommand(context);

	registerOpenDetailsCommands(context);

	registerActiveItemCommands(context);

	registerDismissItemCommand(context);

	vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.refreshAll');

}



// this method is called when your extension is deactivated
export function deactivate() {
	vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.endWork');
	vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.details.closeAll');
}

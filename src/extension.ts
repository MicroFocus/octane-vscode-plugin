// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { BacklogProvider } from './backlog-provider';
import { OctaneEntity, OctaneService } from './octane-service';
import { MyMentionsProvider } from './mentions-provider';
import { MyTestsProvider } from './tests-provider';
import { MyFeatureProvider } from './feature-provider';
import { MyWorkItem } from './my-work-provider';
import { MyTextEditor } from './my-text-editor';
import { MyRequirementsProvider } from './requirements-provider';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const service = OctaneService.getInstance();
	service.initialize();

	const myBacklogProvider = new BacklogProvider(service);
	vscode.window.registerTreeDataProvider('myBacklog', myBacklogProvider);

	const myTestsProvider = new MyTestsProvider(service);
	vscode.window.registerTreeDataProvider('myTests', myTestsProvider);

	const myFeaturesProvider = new MyFeatureProvider(service);
	vscode.window.registerTreeDataProvider('myFeatures', myFeaturesProvider);

	const myMentionsProvider = new MyMentionsProvider(service);
	vscode.window.registerTreeDataProvider('myMentions', myMentionsProvider);

	const myRequirementsProvider = new MyRequirementsProvider(service);
	vscode.window.registerTreeDataProvider('myRequirements', myRequirementsProvider);

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

	// {
	// 	let detailsCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.details', async (node: MyWorkItem) => {
	// 		console.log(`Successfully called details on ${JSON.stringify(node.entity)}.`);
	// 		const uri = vscode.Uri.parse(`${myWorkScheme}:${JSON.stringify(node.entity)}`);
	// 		const doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
	// 		await vscode.window.showTextDocument(doc, { preview: false });
	// 	});
	// 	context.subscriptions.push(detailsCommand);
	// }
	
	const myWorkScheme = 'alm-octane-entity';
	{
		let detailsCommand = vscode.commands.registerCommand('visual-studio-code-plugin-for-alm-octane.details',
			async (node: MyWorkItem) => {
				const data = node.entity;
				const uri = vscode.Uri.parse(`${myWorkScheme}:${JSON.stringify(data)}`);

				const panel = vscode.window.createWebviewPanel(
					'myEditor',
					data?.id ?? '',
					vscode.ViewColumn.One,
					{}
				);
				panel.webview.html = getHtmlForWebview(panel.webview, context, data);
			});

		context.subscriptions.push(detailsCommand);


		function getHtmlForWebview(webview: vscode.Webview, context: any, data: OctaneEntity | undefined): string {
			const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
				context.extensionUri, 'media', 'vscode.css'));
			const myStyle = webview.asWebviewUri(vscode.Uri.joinPath(
				context.extensionUri, 'media', 'my-css.css'));
			return `
				<!DOCTYPE html>
				<head>
					<link href="${styleVSCodeUri}" rel="stylesheet" />
					<link href="${myStyle}" rel="stylesheet" />
				</head>
				<body>
					<div class="information">
						<div class="information-left">
							<input readonly type="text" value="${data?.id ?? ''}">
							<span></span><input readonly type="text" value="${data?.name ?? ''}">
						</div>
						<div class="information-right">
							<input readonly type="text" value="${data?.owner?.fullName ?? '-'}">
							<span></span><input readonly type="text" value="${data?.author?.fullName ?? '-'}">
						</div>
					</div>
					<br><br><br>
					<button class="save" type="button">Save</button>
				</body>
		
			`;
		}

	}



	// const myWorkSchemeProvider = new class implements vscode.TextDocumentContentProvider {
	// 	// const myWorkScheme = 'alm-octane-entity';
	// 	// emitter and its event
	// 	onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
	// 	onDidChange = this.onDidChangeEmitter.event;

	// 	provideTextDocumentContent(uri: vscode.Uri): string {
	// 		return uri.path;
	// 	}
	// };
	// context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myWorkScheme, myWorkSchemeProvider));
}

// this method is called when your extension is deactivated
export function deactivate() { }

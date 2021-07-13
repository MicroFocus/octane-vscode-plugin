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

		function getDataForSubtype(entity: OctaneEntity | undefined): [string, string] {
			if (entity?.subtype) {
				if (entity?.subtype === 'defect')
					return ["D", "#b21646"]
				if (entity?.subtype === 'story')
					return ["US", "#ffb000"]
				if (entity?.subtype === 'quality_story')
					return ["QS", "#33c180"]
				if (entity?.subtype === 'feature')
					return ["F", "#e57828"]
				if (entity?.subtype === 'scenario_test')
					return ["BSC", "#75da4d"]
				if (entity?.subtype === 'test_manual')
					return ["MT", "#00abf3"]
				if (entity?.subtype === 'auto_test')
					return ["AT", "#9b1e83"]
				if (entity?.subtype === 'gherkin_test')
					return ["GT", "#00a989"]
				if (entity?.subtype === 'test_suite')
					return ["TS", "#271782"]
			}
			return ['', ''];
		}

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
					<div class="top-container">
						<div class="icon-container" style="background-color: ${getDataForSubtype(data)[1]}">
							<span class="label">${getDataForSubtype(data)[0]}</span>
						</div>
						<div class="name-container">
							<h3>${data?.name ?? '-'}</h3>
						</div>
						<div class="action-container">
							<select name="action" class="action">
								<option value="saab">In progress</option>
								<option value="saab">In Testing</option>
								<option value="saab">Finished</option>
					  		</select>
							<button class="save" type="button">Save</button>
							<button class="refresh" type="button">Refresh</button>
						</div>
					</div>
					<div class="information">
					<br>
					<hr>
						General
						<div class="information-container">
							<div class="container">
								<span>Id</span>
								<input readonly type="text" value="${data?.id ?? '-'}">
							</div>
							<div class="container">
								<span>Name</span>
								<input readonly type="text" value="${data?.name ?? '-'}">
							</div>
							<div class="container">
								<span>Story points</span>
								<input readonly type="text" value="${data?.storyPoints ?? '-'}">
							</div>
						</div>
						<div class="information-container">
							<div class="container">
								<span>Owner</span>
								<input readonly type="text" value="${data?.owner?.fullName ?? '-'}">
							</div>
							<div class="container">
								<span>Author</span>
								<input readonly type="text" value="${data?.author?.fullName ?? '-'}">
							</div>
							<div class="container">
								<span>Detected by</span>
								<input readonly type="text" value="${data?.detectedBy?.fullName ?? '-'}">
							</div>
						</div>
						<br>
						<hr>
						Description
						<div class="information-container">
							<div class="container">
								<input class="description" readonly type="text" value="${''}">
							</div>
						</div>
						<br>
						<hr>
						Comments
						<div class="information-container">
							<div class="comments-container">
								<input type="text" value="${''}">
								<button class="comments" type="button">Comment</button>
							</div>
						</div>
					</div>
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

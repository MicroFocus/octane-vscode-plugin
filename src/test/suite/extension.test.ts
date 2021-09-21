import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Open extension test', async () => {
		assert.ifError(
			await vscode.commands.executeCommand('onCommand:visual-studio-code-plugin-for-alm-octane.details')
		);
	});

	test('Open search element test', async () => {
		assert.ifError(
			await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.quickPick')
		);
	});

	test('Copy commit message test', async () => {
		assert.ifError(
			await vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.commitMessage')
		);
	});

});
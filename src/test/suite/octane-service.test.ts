import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { OctaneService } from '../../octane/service/octane-service';
import { MyWorkItem } from '../../treeview/my-work-provider';
import sinon, { stubInterface, stubObject } from 'ts-sinon';

suite('OctaneService test suite', () => {

	test('Password authentication should fail with empty credentials', async () => {
		let service = OctaneService.getInstance();
		assert.rejects(service.testAuthentication('https://internal.almoctane.com/', '61004', '5002', '', '', undefined, undefined));
	}).timeout(5000);

	test('SSO authentication test test', async () => {
		let service = OctaneService.getInstance();
		let success = await service.testConnectionOnBrowserAuthentication('https://internal.almoctane.com/');
		assert.strictEqual(success, true, 'Unsuccessful authentication test');
	}).timeout(5000);

	test('initialize with empty stored access details should cause no login', async () => {
		let service = OctaneService.getInstance();
		const commands = stubObject(vscode.commands);
		commands.executeCommand.returns(undefined);
		await service.initialize();
		assert.strictEqual(false, service.isLoggedIn());
	}).timeout(5000);

});
import * as assert from 'assert';

import { OctaneService } from '../../octane/service/octane-service';
import { AlmOctaneAuthenticationSession, AlmOctaneAuthenticationType } from '../../auth/authentication-provider';
import  * as accessDetails from './octane-access-details.json';


function getValidSession(): AlmOctaneAuthenticationSession {
	return {
		// NOTE: octane access details are taken from npm parameters before trying to use the octane-access-details.json file
		accessToken: process.env.npm_config_password ? process.env.npm_config_password : accessDetails.password,
		id: 'test',
		scopes: ['default'],
		type: AlmOctaneAuthenticationType.userNameAndPassword,
		account: {
			id: 'test',
			label: 'test',
			space: process.env.npm_config_space ? process.env.npm_config_space : accessDetails.space,
			workSpace: process.env.npm_config_workspace ? process.env.npm_config_workspace : accessDetails.workspace,
			uri: process.env.npm_config_serverUri ? process.env.npm_config_serverUri : accessDetails.serverUri,
			user: process.env.npm_config_user ? process.env.npm_config_user : accessDetails.user
		},
		cookieName: ''
	};
}

suite('OctaneService test suite', () => {

	test('Password authentication should fail with empty credentials', async () => {
		let service = OctaneService.getInstance();
		assert.rejects(service.testAuthentication(accessDetails.serverUri, accessDetails.space, accessDetails.workspace, '', '', undefined, undefined));
	}).timeout(5000);


	test('Password authentication should succeed with correct credentials', async () => {
		let service = OctaneService.getInstance();
		assert.rejects(service.testAuthentication(accessDetails.serverUri, accessDetails.space, accessDetails.workspace, accessDetails.user, accessDetails.password, undefined, undefined));
	}).timeout(5000);

	test('SSO authentication test test', async () => {
		let service = OctaneService.getInstance();
		let success = await service.testConnectionOnBrowserAuthentication(accessDetails.serverUri);
		assert.strictEqual(success, true, 'Unsuccessful authentication test');
	}).timeout(5000);

	test('initialize with empty stored access details should cause no login', async () => {
		let service = OctaneService.getInstance();
		await service.initialize(undefined);
		assert.strictEqual(false, service.isLoggedIn());
	}).timeout(5000);

	test('initialize with correct stored access details should cause login', async () => {
		let service = OctaneService.getInstance();
		await service.initialize(getValidSession());
		assert.strictEqual(true, service.isLoggedIn());
	}).timeout(5000);

	suite('Octane integration tests', () => {

		OctaneService.getInstance().initialize(getValidSession());
	
		test('My backlog call should not fail', async () => {
			assert.rejects(OctaneService.getInstance().getMyBacklog());
		}).timeout(5000);

		test('My backlog should contain at least 1 element', async () => {
			let myBacklog = await OctaneService.getInstance().getMyBacklog();
			assert.strictEqual(myBacklog && myBacklog.length > 0, true);
		}).timeout(5000);
	});
	
});


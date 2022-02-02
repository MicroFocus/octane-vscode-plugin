import * as assert from 'assert';

import { OctaneService } from '../../octane/service/octane-service';
import * as Octane from '@microfocus/alm-octane-js-rest-sdk';
import * as Query from '@microfocus/alm-octane-js-rest-sdk/lib/query';
import { AlmOctaneAuthenticationSession, AlmOctaneAuthenticationType } from '../../auth/authentication-provider';
import * as accessDetails from './octane-access-details.json';
import * as entitiesToCreate from './octane-test-entities.json';
import { getLogger } from 'log4js';


function getValidSession(): AlmOctaneAuthenticationSession {
	return {
		accessToken: accessDetails.password,
		id: 'test',
		scopes: ['default'],
		type: AlmOctaneAuthenticationType.userNameAndPassword,
		account: {
			id: 'test',
			label: 'test',
			space: accessDetails.space,
			workSpace: accessDetails.workspace,
			uri: accessDetails.serverUri,
			user: accessDetails.user
		},
		cookieName: ''
	};
}

suite('OctaneService test suite', () => {

	test('Password authentication should fail with empty credentials', async () => {
		let service = OctaneService.getInstance();
		await assert.rejects(service.testAuthentication(accessDetails.serverUri, accessDetails.space, accessDetails.workspace, '', '', undefined, undefined));
	}).timeout(5000);


	test('Password authentication should succeed with correct credentials', async () => {
		let service = OctaneService.getInstance();
		await service.testAuthentication(accessDetails.serverUri, accessDetails.space, accessDetails.workspace, accessDetails.user, accessDetails.password, undefined, undefined);
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

	test.skip('grantTokenAuthenticate should log in -- needs user interaction', async function () {
		this.timeout(15000);
		let service = OctaneService.getInstance();
		let details = await service.grantTokenAuthenticate(accessDetails.serverUri);
		assert.strictEqual(details.username, accessDetails.user);
	});

	suite('Octane integration tests', async function () {

		const createdEntities: { endpoint: any; id: string; type: string }[] = [];

		const validSession = getValidSession();

		const octaneInstace = new Octane.Octane({
			server: validSession.account.uri,
			sharedSpace: validSession.account.space,
			workspace: validSession.account.workSpace,
			user: validSession.account.user,
			password: validSession.accessToken,
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				ALM_OCTANE_TECH_PREVIEW: true,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				HPECLIENTTYPE: 'OCTANE_IDE_PLUGIN',
			}
		});

		this.timeout(10000);

		this.beforeAll(async () => {

			await OctaneService.getInstance().initialize(validSession);

			let items = Object.keys(entitiesToCreate);
			for (let i = 0; i < items.length; i++) {
				let entities = entitiesToCreate[items[i] as keyof typeof entitiesToCreate];
				for (let j = 0; j < entities.length; j++) {
					let response = await octaneInstace.create(items[i], entities[j]).execute();
					createdEntities.push({
						endpoint: items[i],
						id: response.data[0].id,
						type: response.data[0].type
					});
				}
			}
		});

		this.afterAll(async () => {
			for (let i = 0; i < createdEntities.length; i++) {
				await octaneInstace.delete(createdEntities[i].endpoint)
					.at(createdEntities[i].id)
					.execute();
			}
		});


		test('My backlog call should not fail', async () => {
			await OctaneService.getInstance().getMyBacklog();
		});

		test('My backlog should contain at least 1 element', async () => {
			let myBacklog = await OctaneService.getInstance().getMyBacklog();
			assert.strictEqual(myBacklog && myBacklog.length > 0, true);
		});

		test('add to my work should add the entity in my work', async () => {
			await OctaneService.getInstance().addToMyWork({
				id: createdEntities[0].id,
				type: 'work_item'
			});
			let myBacklog = await OctaneService.getInstance().getMyBacklog();
			assert.strictEqual(myBacklog && myBacklog.filter( e => e.id === createdEntities[0].id).length === 1, true);
		});

		test('dismiss should remove the entity from my work', async () => {
			await OctaneService.getInstance().dismissFromMyWork({
				id: createdEntities[0].id,
				type: 'work_item'
			});
			let myBacklog = await OctaneService.getInstance().getMyBacklog();
			assert.strictEqual(myBacklog && myBacklog.filter( e => e.id === createdEntities[0].id).length === 0, true);
		});

	});

});



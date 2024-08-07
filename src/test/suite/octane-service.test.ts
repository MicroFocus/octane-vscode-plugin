/*
 * Copyright 2021-2023 Open Text.
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';

import { OctaneService } from '../../octane/service/octane-service';
import { Octane, Query } from '@microfocus/alm-octane-js-rest-sdk';
import { AlmOctaneAuthenticationSession, AlmOctaneAuthenticationType } from '../../auth/authentication-provider';
import * as accessDetails from './octane-access-details.json';
import * as entitiesToCreate from './octane-test-entities.json';
import { getLogger } from 'log4js';


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
		const validSession = getValidSession();
		await assert.rejects(service.testAuthentication(validSession.account.uri, validSession.account.space, validSession.account.workSpace, '', '', undefined, undefined));
	}).timeout(5000);


	test('Password authentication should succeed with correct credentials', async () => {
		let service = OctaneService.getInstance();
		const validSession = getValidSession();
		await service.testAuthentication(validSession.account.uri, validSession.account.space, validSession.account.workSpace, validSession.account.user, validSession.accessToken, undefined, undefined);
	}).timeout(5000);

	test('SSO authentication test test', async () => {
		let service = OctaneService.getInstance();
		const validSession = getValidSession();
		let success = await service.testConnectionOnBrowserAuthentication(validSession.account.uri);
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
		const validSession = getValidSession();
		let details = await service.grantTokenAuthenticate(validSession.account.uri);
		assert.strictEqual(details.username, validSession.account.user);
	});

	suite('Core Software Delivery Platform integration tests', async function () {

		const createdEntities: { endpoint: any; id: string; type: string }[] = [];

		const validSession = getValidSession();

		const octaneInstace = new Octane({
			server: validSession.account.uri,
			sharedSpace: Number(validSession.account.space),
			workspace: Number(validSession.account.workSpace),
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
					.at(Number(createdEntities[i].id))
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



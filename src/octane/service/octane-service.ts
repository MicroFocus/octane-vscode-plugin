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

import * as vscode from 'vscode';
import { Octane, Query } from '@microfocus/alm-octane-js-rest-sdk';
import { OctaneEntity } from '../model/octane-entity';
import { Task } from '../model/task';
import { Transition } from '../model/transition';
import { Comment } from '../model/comment';
import { AlmOctaneAuthenticationSession, AlmOctaneAuthenticationType } from '../../auth/authentication-provider';
import fetch, { Headers, RequestInit } from 'node-fetch';
import { getLogger } from 'log4js';
import { retryDecorator } from 'ts-retry-promise';
import { User } from '../model/user';
import { ErrorHandler } from './error-handler';

export class OctaneService {

    private logger = getLogger('vs');
    private static _instance: OctaneService;

    private octane?: any;

    private loggedInUserId?: number;
    private loggedInUserName?: string;
    private transitions?: Transition[];

    private octaneMap = new Map<string, any[]>();

    private password?: string;
    private session?: AlmOctaneAuthenticationSession;

    private LWSSO_COOKIE_KEY?: string;

    private constructor() {
    }

    public async testConnectionOnBrowserAuthentication(uri: string): Promise<boolean> {
        try {
            const fetchResult = await fetch(`${uri}authentication/tokens`, { method: 'POST' });
            return fetchResult ? true : false;
        } catch (e) {
            throw e;
        }
    }

    public async testAuthentication(uri: string, space: string | undefined, workspace: string | undefined, username: string, password: string, cookieName: string | undefined, cookie: string | undefined): Promise<string | undefined | any> {
        const octaneInstace = new Octane({
            server: uri,
            sharedSpace: Number(space),
            workspace: Number(workspace),
            user: username,
            password:  (cookieName === undefined || cookieName === '') ? password : '',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                ALM_OCTANE_TECH_PREVIEW: true,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                HPECLIENTTYPE: 'OCTANE_IDE_PLUGIN',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Cookie: (cookieName === undefined || cookieName === '') ? '' : `${cookieName}=${cookie}`
            }
        });
        try {
            const result: any = await octaneInstace.get(Octane.entityTypes.workspaceUsers)
                .fields('id', 'name', 'full_name')
                .query(Query.field('name').equal(username).build())
                .execute();
            this.logger.debug('Successful auth test.', result.data);
            return result.data && result.data[0] ? (result.data[0].full_name ? result.data[0].full_name : username) : username;
        } catch (e: any) {
            throw e;
        }
    }

    public storePasswordForAuthentication(password: string | undefined) {
        this.password = password;
    }

    public getPasswordForAuthentication(): string | undefined {
        return this.password;
    }

    public async initialize(session: AlmOctaneAuthenticationSession | undefined) {

        this.session = session;

        this.octaneMap = new Map<string, any[]>();

        try {
            await this.initializeOctaneInstance();
        } catch (e: any) {
            this.logger.error(ErrorHandler.handle(e));
        }
    }

    public async initializeOctaneInstance() {
        try {
            if (this.session && this.session.account.uri && this.session.account.space && this.session.account.workSpace && this.session.account.user) {
                this.octane = new Octane({
                    server: this.session.account.uri,
                    sharedSpace: Number(this.session.account.space),
                    workspace: Number(this.session.account.workSpace),
                    user: this.session.account.user,
                    password:  this.session.type === AlmOctaneAuthenticationType.userNameAndPassword ? this.session.accessToken : '',
                    headers: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        ALM_OCTANE_TECH_PREVIEW: true,
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        HPECLIENTTYPE: 'OCTANE_IDE_PLUGIN',
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        Cookie: this.session.type === AlmOctaneAuthenticationType.browser ? `${this.session.cookieName}=${this.session.accessToken}` : ''
                    }
                });
                const result: any = await this.octane.get(Octane.entityTypes.workspaceUsers)
                    .query(Query.field('name').equal(this.session.account.user).build())
                    .execute();
                this.loggedInUserId = result.data[0].id;
                this.loggedInUserName = result.data[0].full_name ?? result.data[0].email;

                {
                    const result = await this.octane.get(Octane.entityTypes.transitions)
                        .fields('id', 'entity', 'logical_name', 'is_primary', 'source_phase{name}', 'target_phase{name}')
                        .execute();
                    this.transitions = result.data.map((t: any) => new Transition(t));
                    this.logger.debug(this.transitions);
                }
            } else {
                this.loggedInUserId = undefined;
                this.loggedInUserName = undefined;
            }
        } catch (e: any) {
            throw e;
        }
    }

    public async globalSearch(endPoint: string, subtype: string | string[] | undefined, criteria: string, fields: string[]): Promise<OctaneEntity[]> {
        try {
            let request = this.octane.get(endPoint).fields([...fields, 'global_text_search_result']);
            if (subtype !== undefined) {
                if (Array.isArray(subtype)) {
                    request = request.query(
                        Query.field('subtype').inComparison(subtype).build()
                    );
                } else {
                    request = request.query(
                        Query.field('subtype').equal(subtype).build()
                    );
                }
            }
            request = request.limit(`5&text_search={"type":"global","text":"${criteria}"}`);

            const response = await request.execute();
            this.logger.debug('Global search response', response);
            if (response.data && response.data.length) {
                let detailsRequest = this.octane.get(endPoint).fields(fields)
                    .query(Query.field('id').inComparison(response.data.map((r: any) => r.id)).build());
                let responseWithFields = await detailsRequest.execute();

                let entities = responseWithFields.data.map((r: any) => {
                    let gsr = response.data.find((re: { id: any; }) => re.id === r.id);
                    if (gsr && gsr.global_text_search_result) {
                        r.global_text_search_result = gsr?.global_text_search_result.description;
                    }
                    let oe = new OctaneEntity(r);
                    this.logger.debug('Extended oe', oe);
                    return oe;
                });
                this.logger.debug('Global search results: ', entities);
                return entities;
            }
            return [];
        } catch (e: any) {
            this.logger.error('While global searching', ErrorHandler.handle(e));
            return [];
        }
    }

    public async globalSearchWorkItems(subtype: string, criteria: string): Promise<OctaneEntity[]> {
        try {
            const fields = ['name', 'story_points', 'phase', 'owner{id,name,full_name}',
                'invested_hours', 'estimated_hours', 'remaining_hours',
                'detected_by{id,name,full_name}', 'severity', 'author{id,name,full_name}'];
            return this.globalSearch(Octane.entityTypes.workItems, subtype, criteria, fields);
        } catch (e: any) {
            this.logger.error('While global searching work items.', ErrorHandler.handle(e));
            return [];
        }
    }

    public async globalSearchRequirements(criteria: string): Promise<OctaneEntity[]> {
        try {
            const fields = ['name', 'phase', 'owner{id,name,full_name}', 'author{id,name,full_name}'];
            return this.globalSearch(Octane.entityTypes.requirements, 'requirement_document', criteria, fields);
        } catch (e: any) {
            this.logger.error('While global searching requirements.', ErrorHandler.handle(e));
            return [];
        }
    }

    public async globalSearchTasks(criteria: string): Promise<OctaneEntity[]> {
        try {
            let fields = ['id', 'name', 'author{id,name,full_name}', 'owner{id,name,full_name}', 'phase'];
            return this.globalSearch(Octane.entityTypes.tasks, undefined, criteria, fields);
        } catch (e: any) {
            this.logger.error('While global searching tasks.', ErrorHandler.handle(e));
            return [];
        }
    }

    public async globalSearchTests(criteria: string): Promise<OctaneEntity[]> {
        try {
            let fields = ['name', 'owner{id,name,full_name}', 'author{id,name,full_name}', 'phase'];
            return this.globalSearch(Octane.entityTypes.tests, ['test_manual', 'test_suite', 'gherkin_test', 'test_automated', 'scenario_test'], criteria, fields);
        } catch (e: any) {
            this.logger.error('While global searching tests.', ErrorHandler.handle(e));
            return [];
        }
    }

    public isLoggedIn(): boolean {
        return this.loggedInUserId !== undefined;
    }

    public getLoggedInUserName(): string {
        return this.loggedInUserName ?? '';
    }

    private async refreshMyWork(subtype: string | string[]): Promise<OctaneEntity[]> {
        try {
            let subtypes: string[] = [];
            if (!Array.isArray(subtype)) {
                subtypes.push(subtype);
            } else {
                subtypes = subtype;
            }
            const response = await this.octane.get(Octane.entityTypes.workItems)
                .fields('name', 'story_points', 'phase', 'owner{id,name,full_name}',
                    'invested_hours', 'estimated_hours', 'remaining_hours',
                    'detected_by{id,name,full_name}', 'severity', 'author{id,name,full_name}')
                .query(
                    Query.field('subtype').inComparison(subtypes).and()
                        .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                        .build()
                )
                .orderBy('creation_time')
                .execute();
            let entities = response.data.map((r: any) => new OctaneEntity(r));
            this.logger.debug(entities);
            return entities;
        } catch (e: any) {
            throw e;
        }
    }

    public static getInstance(): OctaneService {
        if (!OctaneService._instance) {
            OctaneService._instance = new OctaneService();
        }
        return OctaneService._instance;
    }

    public async getMyBacklog(): Promise<OctaneEntity[]> {
        try {
            return this.refreshMyWork(['defect', 'story', 'quality_story']);
        } catch (e: any) {
            throw e;
        }
    }

    public async getMyRequirements(): Promise<OctaneEntity[]> {
        try {
            const response = await this.octane.get(Octane.entityTypes.requirements)
                .fields('name', 'phase', 'owner{id,name,full_name}', 'author{id,name,full_name}')
                .query(
                    Query.field('subtype').inComparison(['requirement_document']).and()
                        .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                        .build()
                )
                .orderBy('creation_time')
                .execute();
            this.logger.debug(response);

            let entities = response.data.map((r: any) => new OctaneEntity(r));
            this.logger.debug(entities);
            return entities;
        } catch (e: any) {
            throw e;
        }
    }

    public async getMyDefects(): Promise<OctaneEntity[]> {
        try {
            return this.refreshMyWork('defect');
        } catch (e: any) {
            throw e;
        }
    }

    public async getMyFeatures(): Promise<OctaneEntity[]> {
        try {
            return this.refreshMyWork('feature');
        } catch (e: any) {
            throw e;
        }
    }

    public async getMyStories(): Promise<OctaneEntity[]> {
        try {
            return this.refreshMyWork('story');
        } catch (e: any) {
            throw e;
        }
    }

    public async getMyQualityStories(): Promise<OctaneEntity[]> {
        try {
            return this.refreshMyWork('quality_story');
        } catch (e: any) {
            throw e;
        }
    }

    public async getMyTests(): Promise<OctaneEntity[]> {
        try {
            const response = await this.octane.get(Octane.entityTypes.tests)
                .fields('name', 'owner{id,name,full_name}', 'author{id,name,full_name}', 'phase')
                .query(
                    Query.field('subtype').inComparison(['test_manual', 'gherkin_test', 'scenario_test']).and()
                        .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                        .build()
                )
                .orderBy('creation_time')
                .execute();
            let entities = response.data.map((r: any) => new OctaneEntity(r));
            this.logger.debug(entities);
            return entities;
        } catch (e: any) {
            throw e;
        }
    }

    public async getMyTestRuns(): Promise<OctaneEntity[]> {
        try {
            const response = await this.octane.get(Octane.entityTypes.runs)
                .fields('name', 'author{id,name,full_name}', 'run_by{full_name}')
                .query(
                    Query.field('subtype').inComparison(['run_manual', 'run_suite']).and()
                        .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                        .build()
                )
                .orderBy('creation_time')
                .execute();
            let entities = response.data.map((r: any) => new OctaneEntity(r));
            this.logger.debug(entities);
            return entities;
        } catch (e: any) {
            throw e;
        }
    }

    public async getMyMentions(): Promise<OctaneEntity[]> {
        try {
            const response = await this.octane.get(Octane.entityTypes.comments)
                .fields('text', 'owner_work_item', 'owner_requirement', 'owner_test', 'owner_run', 'owner_bdd_spec', 'owner_task', 'author{id,name,full_name}')
                .query(
                    Query.field('mention_user').equal(Query.field('id').equal(this.loggedInUserId))
                        .build()
                )
                .orderBy('creation_time')
                .execute();
            let entities = response.data.map((r: any) => new Comment(r));
            this.logger.debug(entities);
            return entities;
        } catch (e: any) {
            throw e;
        }
    }

    public async getMyTasks(): Promise<OctaneEntity[]> {
        try {
            const response = await this.octane.get(Octane.entityTypes.tasks)
                .fields('id', 'name', 'author{id,name,full_name}', 'owner{id,name,full_name}', 'phase', 'story')
                .query(
                    Query.field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                        .build()
                )
                .orderBy('creation_time')
                .execute();
            let entities = response.data.map((r: any) => new Task(r));
            this.logger.debug(entities);
            return entities;
        } catch (e: any) {
            throw e;
        }
    }

    public async getCommentsForEntity(entity: OctaneEntity): Promise<Comment[] | undefined> {
        if (!entity || !entity.id) {
            return;
        }
        try {
            const response = await this.octane.get(Octane.entityTypes.comments)
                .fields('id', 'author', 'owner_work_item', 'owner_requirement', 'owner_test', 'owner_run', 'owner_bdd_spec', 'owner_task', 'creation_time', 'text')
                .query(
                    Query.field(`owner_${entity.type}`).equal(Query.field('id').equal(entity.id))
                        .build()
                )
                .execute();
            let entities = response.data.map((r: any) => new Comment(r));
            return entities;
        } catch (e: any) {
            this.logger.error('While retreiving comment: ', ErrorHandler.handle(e));
        }
    }

    public postCommentForEntity(comment: Comment | undefined) {
        if (!comment) {
            return;
        }
        if (comment.ownerEntity && comment.ownerEntity.type) {
            let body: any = {};
            body[`owner_${comment.ownerEntity?.type}`] = {
                id: comment.ownerEntity?.id,
                type: comment.ownerEntity?.subtype ?? comment.ownerEntity?.type
            };
            body['text'] = comment.text;
            const endPoint = entityTypeApiEndpoint.get('comment');
            this.octane.create(endPoint, body).execute()
                .then((res: any) => {
                    vscode.window.showInformationMessage('Your comment has been saved.');
                }, (error: any) => {
                    this.logger.error('While saving comment: ', ErrorHandler.handle(error));
                    vscode.window.showErrorMessage((error.response.body.description) ?? 'We couldn’t save your comment.');
                });
        }
    }

    private async getRemoteFieldsForType(type: string) {
        if (!this.isLoggedIn()) {
            throw new Error('Please log in to query Core Software Delivery Platform entities.');
        }
        try {
            const result = await this.octane.get(Octane.entityTypes.fieldsMetadata)
                .query(Query.field('entity_name').inComparison([type])
                    .and()
                    .field('visible_in_ui').equal('true')
                    .build())
                .execute();

            result.data.forEach((element: any) => {
                setValueForMap(this.octaneMap, element.entity_name, element);
            });
        } catch (e: any) {
            this.logger.error('While fetching remote fields.', ErrorHandler.handle(e));
        }
    }

    public async getFieldsForType(type: string) {
        if (!this.octaneMap.get(type) || !this.octaneMap.get(type)?.length) {
            await this.getRemoteFieldsForType(type);
        }
        return this.octaneMap.get(type);
    }

    public async getDataFromOctaneForTypeAndId(type: string | undefined, subType: string | undefined, id: string, fields?: any[]) {
        const octaneType = subType || type;
        if (!octaneType) {
            return;
        }

        if (!fields) {
            fields = await this.getFieldsForType(octaneType);

            if (!fields) {
                this.logger.error(`Could not determine fields for type ${octaneType}.`);
                return;
            }
        }

        const apiEntityType = type || subType;
        if (!apiEntityType) {
            return;
        }
        const endPoint = entityTypeApiEndpoint.get(apiEntityType);
        if (!endPoint) {
            return;
        }
        const result = await this.octane.get(endPoint)
            .fields(
                fields.map((f: any) => f.name)
            )
            .at(id)
            .execute();
        return result;
    }

    public getPhaseTransitionForEntity(phaseId: string): Transition[] {
        if (this.transitions) {
            const transitions = this.transitions.filter(t =>
                (t.sourcePhase && t.sourcePhase.id === phaseId)
            );
            this.logger.debug("[transitions] ", transitions);
            return transitions;
        }
        return [];
    }

    public async updateEntity(type: string | undefined, subType: string | undefined, body: any) {
        this.logger.debug("[update] ", body);
        const apiEntityType = type || subType;
        if (!apiEntityType) {
            return;
        }
        const endPoint = entityTypeApiEndpoint.get(apiEntityType);
        if (!endPoint) {
            return;
        }
        try {
            await this.octane.get(endPoint).at(body.id).execute();
            await this.octane.update(endPoint, body).execute();
            vscode.window.showInformationMessage('Your item changes have been saved.');
        } catch (error: any) {
            this.logger.error('While updating entity: ', ErrorHandler.handle(error));
            vscode.window.showErrorMessage((error.response.body.description) ?? 'We couldn’t save your changes');
        }
    }

    public async getFullDataForEntity(entityTypes: string, field: any, fullData: any) {
        let endPoint;
        if (entityTypes === 'product_area') {
            endPoint = entityTypeApiEndpoint.get('application_module');
        } else {
            endPoint = entityTypeApiEndpoint.get(entityTypes);
        }
        if (!endPoint) {
            return;
        }
        try {
            if (entityTypes === 'list_node') {
                const result = await this.octane.get(endPoint)
                    .query(
                        Query.field('list_root').equal(Query.field('logical_name').equal(field.field_type_data.targets[0].logical_name))
                            .build())
                    .execute();
                return result ?? undefined;
            }
            if (entityTypes === 'story') {
                const result = await this.octane.get(endPoint)
                    .execute();
                return result ?? undefined;
            }
            if (entityTypes === 'product_area') {
                const result = await this.octane.get(endPoint)
                    .execute();
                this.logger.debug('application_modules', result);
                return result ?? undefined;
            }
            if (entityTypes === 'sprint' && fullData['release']) {
                const result = await this.octane.get(endPoint)
                    .query(
                        Query.field('release').equal(Query.field('id').equal(fullData['release'].id))
                            .build())
                    .execute();
                return result ?? undefined;
            } 
            if (entityTypes === 'workspace_user') {
                const result = await this.octane.get(endPoint)
                    .query(Query.field('activity_level').equal(0).build())
                    .execute();
                return result ?? undefined;
            } else {
                const result = await this.octane.get(endPoint)
                    .execute();
                return result ?? undefined;
            }
        } catch (e: any) {
            this.logger.error('While getting full data for entity ', ErrorHandler.handle(e));
        }
    }

    private async JSONauthenticate(session: any) {
        var myHeaders = this.commonHeaders();
        myHeaders.append('Content-Type', 'application/json');
        let body: any = {
            user: session.account.user,
            password: session.accessToken
        };
        let requestOptions: RequestInit = {
            method: 'POST',
            headers: myHeaders,
            redirect: 'follow',
            body: JSON.stringify(body)
        };
        try {
            let result = await fetch(`${session.account.uri}authentication/sign_in`, requestOptions);
            if (result && result.ok) {
                this.LWSSO_COOKIE_KEY = undefined;
                const rawHeaders = result.headers.raw()['set-cookie'].forEach(h => {
                    if (this.LWSSO_COOKIE_KEY === undefined) {
                        this.LWSSO_COOKIE_KEY = h.split(';')[0];
                    } else {
                        this.LWSSO_COOKIE_KEY += ';' + h.split(';')[0];
                    }
                });
            }
        } catch (error: any) {
            this.logger.error('While authenticating with JSONauthentication ', ErrorHandler.handle(error));
        }
    }

    public async fetchAttachment(id: number): Promise<string> {
        if (this.session) {
            let myHeaders = this.setHeaders(this.session);
            let requestOptions: RequestInit = {
                method: 'GET',
                headers: myHeaders,
                redirect: 'follow'
            };
            try {
                const ATTACHMENT_URL: string = `${this.session.account.uri}api/shared_spaces/${this.session.account.space}/workspaces/${this.session.account.workSpace}/attachments/${id}`;
                let result = await fetch(ATTACHMENT_URL, requestOptions);
                if (result && result.status === 401) {
                    await this.JSONauthenticate(this.session);
                    if (this.LWSSO_COOKIE_KEY) {
                        myHeaders.append('Cookie', `${this.LWSSO_COOKIE_KEY}`);
                        requestOptions.headers = myHeaders;
                        result = await fetch(ATTACHMENT_URL, requestOptions);
                    }
                }
                const buffer = await result.buffer();
                return `data:${result.headers.get('Content-Type')};base64,` + buffer.toString('base64');
            } catch (e: any) {
                this.logger.error('While downloading attachment ', ErrorHandler.handle(e));
                vscode.window.showErrorMessage((e.error?.errors[0]?.description) ?? 'Attachment download failed.');
            }
        }
        return '';
    }

    private setHeaders(session: any, contentType?: string): Headers {
        var myHeaders = this.commonHeaders();
        if (session.type === AlmOctaneAuthenticationType.browser) {
            myHeaders.append('Cookie', `${session.cookieName}=${session.accessToken}`);
        } else {
            if (this.LWSSO_COOKIE_KEY) {
                myHeaders.append('Cookie', `${this.LWSSO_COOKIE_KEY}`);
            }
            myHeaders.set('Authorization', 'Basic ' + Buffer.from(session.account.user + ":" + session.accessToken).toString('base64'));
        }
        if (contentType) {
            myHeaders.append('Content-Type', `application/${contentType}`);
        } else {
            myHeaders.append('Content-Type', 'application/octet-stream');
        }
        return myHeaders;
    }

    private commonHeaders(): Headers {
        var myHeaders = new Headers();
        myHeaders.append('ALM_OCTANE_TECH_PREVIEW', 'true');
        myHeaders.append('HPECLIENTTYPE', 'OCTANE_IDE_PLUGIN');
        return myHeaders;
    }

    public async downloadScriptForTest(e: OctaneEntity): Promise<string> {
        try {
            const script = await this.octane.get(Octane.entityTypes.tests).at(e.id).script().execute();
            return script.script;
        } catch (e: any) {
            throw e;
        }
    }

    public async addToMyWork(e: OctaneEntity): Promise<void> {
        try {
            if (!this.loggedInUserId) {
                return;
            }
            let type = e.type;
            let entityModel: any = {
                origin: 1,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                entity_type: `${type}`, // "test"
                reason: null,
                user: {
                    type: 'workspace_user',
                    id: +this.loggedInUserId
                },
                // eslint-disable-next-line @typescript-eslint/naming-convention
                is_new: true,
            };
            entityModel[`my_follow_items_${type}`] = {
                type: `${type}`,
                id: +e.id
            };

            let entityTypes = e.type || e.subtype;
            if (entityTypes) {
                let endpoint = entityTypeApiEndpoint.get(entityTypes);
                const response = await this.octane.get(endpoint)
                    .query(
                        Query.field('user_item').equal(
                            Query.field('user').equal(
                                Query.field('id').equal(this.loggedInUserId)
                            )
                        ).and().field('id').equal(e.id)
                            .build()
                    )
                    .execute();
                if (response && response.data.length !== 0) {
                    vscode.window.showWarningMessage(`Item was not added, it is already in "My work"`);
                } else {
                    try {
                        await this.octane.create(Octane.entityTypes.userItems, entityModel).execute();
                        vscode.window.showInformationMessage('Your item changes have been saved.');
                    } catch (e: any) {
                        this.logger.error('While adding to MyWork.', e);
                        vscode.window.showErrorMessage((e.error?.errors[0]?.description) ?? 'We couldn’t save your changes.');
                    }
                }
            }
        } catch (e: any) {
            this.logger.error('While adding to MyWork ', ErrorHandler.handle(e));
            throw e;
        }
    }

    public async dismissFromMyWork(e: OctaneEntity): Promise<void> {
        try {
            if (!this.loggedInUserId) {
                return;
            }
            let type = e.type;
            if (e.type === 'comment') {

                if (this.session) {
                    let myHeaders = this.setHeaders(this.session, 'json');
                    let entityModel: string = JSON.stringify({
                        id: `${e.id}`
                    });

                    var requestOptions: RequestInit = {
                        method: 'PUT',
                        headers: myHeaders,
                        body: entityModel,
                        redirect: 'follow'
                    };

                    try {
                        let result = await fetch(`${this.session.account.uri}internal-api/shared_spaces/${this.session.account.space}/workspaces/${this.session.account.workSpace}/comments/${e.id}/dismiss`, requestOptions);
                        if (result && result.status === 401) {
                            await this.JSONauthenticate(this.session);
                            if (this.LWSSO_COOKIE_KEY) {
                                myHeaders.append('Cookie', `${this.LWSSO_COOKIE_KEY}`);
                                requestOptions.headers = myHeaders;
                                result = await fetch(`${this.session.account.uri}internal-api/shared_spaces/${this.session.account.space}/workspaces/${this.session.account.workSpace}/comments/${e.id}/dismiss`, requestOptions);
                            }
                        }                        
                        vscode.window.showInformationMessage('Item dismissed.');
                        this.logger.debug(result);
                    } catch (e: any) {
                        vscode.window.showErrorMessage((e.error?.errors[0]?.description) ?? 'Item dismissal failed');
                    }
                }
            } else {
                let field = 'my_follow_items_work_item';
                switch (e.type) {
                    case 'task':
                        field = 'my_follow_items_task';
                        break;
                    case 'run':
                        field = 'my_follow_items_run';
                        break;
                    case 'test':
                        field = 'my_follow_items_test';
                        break;
                    case 'requirement':
                        field = 'my_follow_items_requirement';
                        break;
                }

                try {
                    await this.octane.delete(Octane.entityTypes.userItems)
                        .query(Query.field(field).equal(Query.field('id').equal(e.id))
                            .and()
                            .field('user').equal(Query.field('id').equal(this.loggedInUserId))
                            .and()
                            .field('entity_type').equal(type)
                            .build())
                        .execute();
                    vscode.window.showInformationMessage('Item dismissed.');
                } catch (e: any) {
                    this.logger.error('While dismiss entity ', ErrorHandler.handle(e));
                    vscode.window.showErrorMessage((e.error?.errors[0]?.description) ?? 'Item dismissal failed');
                }
            }
        } catch (e: any) {
            this.logger.error('While dismissing entity from MyWork ', ErrorHandler.handle(e));
        }
    }

    public getBrowserUri(entity: any): vscode.Uri {
        try {
            return vscode.Uri.parse(`${this.session?.account.uri}ui/?p=${this.session?.account.space}%2F${this.session?.account.workSpace}#/entity-navigation?entityType=${entity.type}&id=${entity.id}`);
        } catch (e: any) {
            throw e;
        }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public async grantTokenAuthenticate(uri: string): Promise<{ cookieName: string, accessToken: string, username: string }> {
        try {
            var requestOptions: RequestInit = {
                method: 'GET',
                headers: this.commonHeaders(),
                redirect: 'follow'
            };
            const idResult = await fetch(`${uri}authentication/grant_tool_token`, requestOptions);
            if (idResult.ok) {
                const response = await idResult.json();
                this.logger.debug(response);
                const browserResponse = await vscode.env.openExternal(vscode.Uri.parse(response?.authentication_url));
                if (!browserResponse) {
                    throw new Error('Opening external browser window was not possible.');
                }
                const self = this;
                const logWrapper = function (msg: string) {
                    self.logger.debug(msg);
                };

                const decoratedFetchToken = retryDecorator(this.fetchAuthenticationToken, { retries: 100, delay: 1000, logger: logWrapper });
                const token = await decoratedFetchToken(self, uri, response);
                this.logger.debug('Fetchtoken returned: ', token);

                const userResponse = await this.fetchCurrentUser(uri, token);
                return { cookieName: token.cookie_name, accessToken: token.access_token, username: userResponse.name ?? '' };
            }
            throw new Error(`While fetching grant token: ${idResult.statusText}`);
        } catch (e: any) {
            throw e;
        }
    }

    private async fetchAuthenticationToken(self: any, uri: string, response: any): Promise<any> {
        let headers = self.commonHeaders();
        headers.append('Content-Type', 'application/json');
        var requestOptions: RequestInit = {
            method: 'POST',
            headers: headers,
            redirect: 'follow',
            body: JSON.stringify({ identifier: response.identifier })
        };
        const tokenResult = await fetch(`${uri}authentication/grant_tool_token`, requestOptions);
        const logger = getLogger('vs');
        if (tokenResult.ok) {
            const tokenResponse = await tokenResult.json();
            logger.debug(tokenResponse);
            return tokenResponse;
        } else {
            throw new Error(tokenResult.statusText);
        }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private async fetchCurrentUser(uri: string, token: { cookie_name: string, access_token: string }): Promise<User> {
        try {
            let headers = this.commonHeaders();
            headers.append('Cookie', `${token.cookie_name}=${token.access_token}`);
            var requestOptions: RequestInit = {
                method: 'GET',
                headers: headers,
                redirect: 'follow'
            };
            const userResponse = await fetch(`${uri}api/current_user`, requestOptions);
            return new User(await userResponse.json());
        } catch (e: any) {
            throw e;
        }
    }
}

function setValueForMap(map: any, key: any, value: any) {
    if (!map.has(key)) {
        map.set(key, [value]);
        return;
    }
    map.get(key).push(value);
}

const entityTypeApiEndpoint: Map<string, string> = new Map([
    ['application_module', Octane.entityTypes.applicationModules],
    ['attachment', Octane.entityTypes.applicationModules],
    ['automated_run', Octane.entityTypes.automatedRuns],
    ['ci_build', Octane.entityTypes.ciBuilds],
    ['comment', Octane.entityTypes.comments],
    ['defect', Octane.entityTypes.defects],
    ['epic', Octane.entityTypes.epics],
    ['feature', Octane.entityTypes.features],
    ['gherkin_test', Octane.entityTypes.gherkinTests],
    ['list_node', Octane.entityTypes.listNodes],
    ['manual_run', Octane.entityTypes.manualRuns],
    ['manualTest', Octane.entityTypes.manualTests],
    ['metaphase', Octane.entityTypes.metaphases],
    ['milestone', Octane.entityTypes.milestones],
    ['phase', Octane.entityTypes.phases],
    ['pipeline_node', Octane.entityTypes.pipelineNodes],
    ['pipeline_run', Octane.entityTypes.pipelineRuns],
    ['previous_run', Octane.entityTypes.previousRuns],
    ['program', Octane.entityTypes.programs],
    ['release', Octane.entityTypes.releases],
    ['requirement_document', Octane.entityTypes.requirementDocuments],
    ['requirement_folder', Octane.entityTypes.requirementFolders],
    ['requirement_root', Octane.entityTypes.requirementRoots],
    ['requirement', Octane.entityTypes.requirements],
    ['role', Octane.entityTypes.roles],
    ['run_step', Octane.entityTypes.runSteps],
    ['run', Octane.entityTypes.runs],
    ['scm_commit', Octane.entityTypes.scmCommits],
    ['sprint', Octane.entityTypes.sprints],
    ['story', Octane.entityTypes.stories],
    ['suite_run', Octane.entityTypes.suiteRun],
    ['task', Octane.entityTypes.tasks],
    ['taxonomy_category_node', Octane.entityTypes.taxonomyCategoryNodes],
    ['taxonomy_item_node', Octane.entityTypes.taxonomyItemNodes],
    ['taxonomy_node', Octane.entityTypes.taxonomyNodes],
    ['team_sprint', Octane.entityTypes.teamSprints],
    ['team', Octane.entityTypes.teams],
    ['test_suite_link_to_automated_test', Octane.entityTypes.testSuiteLinkToAutomatedTests],
    ['test_suite_link_to_gherkin_test', Octane.entityTypes.testSuiteLinkToGherkinTests],
    ['test_suite_link_to_manual_test', Octane.entityTypes.testSuiteLinkToManualTests],
    ['test_suite_link_to_test', Octane.entityTypes.testSuiteLinkToTests],
    ['test_suite', Octane.entityTypes.testSuites],
    ['test', Octane.entityTypes.tests],
    ['transition', Octane.entityTypes.transitions],
    ['user_item', Octane.entityTypes.userItems],
    ['user_tag', Octane.entityTypes.userTags],
    ['user', Octane.entityTypes.users],
    ['work_item_root', Octane.entityTypes.workItemRoots],
    ['work_item', Octane.entityTypes.workItems],
    ['workspace_role', Octane.entityTypes.workspaceRoles],
    ['workspace_user', Octane.entityTypes.workspaceUsers],
    ['quality_story', Octane.entityTypes.qualityStories],
    ['bdd_spec', 'bdd_specs']
]);

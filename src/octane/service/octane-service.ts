import * as vscode from 'vscode';
import * as Octane from '@microfocus/alm-octane-js-rest-sdk';
import * as Query from '@microfocus/alm-octane-js-rest-sdk/lib/query';
import { OctaneEntity } from '../model/octane-entity';
import { Task } from '../model/task';
import { Transition } from '../model/transition';
import { Comment } from '../model/comment';
import { AlmOctaneAuthenticationProvider, AlmOctaneAuthenticationSession, AlmOctaneAuthenticationType } from '../../auth/authentication-provider';
import fetch, { Headers, RequestInit } from 'node-fetch';
import { getLogger } from 'log4js';

export class OctaneService {

    private logger = getLogger('vs');
    private static _instance: OctaneService;

    public static entitiesToOpenExternally = [
        'epic',
        'test_suite',
        'test_automated'
    ];

    public static typeLabels: Map<string, string> = new Map([
        ['story', 'user story'],
        ['quality_story', 'quality story']
    ]);

    private octane?: any;

    private user?: string;
    private uri?: string;
    private space?: string;
    private workspace?: string;
    private loggedInUserId?: number;
    private transitions?: Transition[];
    private phases = new Map<string, string>();

    private octaneMap = new Map<string, any[]>();

    private password?: string;
    private session?: AlmOctaneAuthenticationSession;

    public async testConnectionOnBrowserAuthentication(uri: string) {
        try {
            const fetchResult = await fetch(`${uri}authentication/tokens`, { method: 'POST' });
            return fetchResult ? true : false;
        } catch (e) {
            return false;
        }
    }

    public async testAuthentication(uri: string, space: string | undefined, workspace: string | undefined, username: string, password: string | undefined, cookieName: string | undefined, cookie: string | undefined): Promise<string | undefined | any> {
        const octaneInstace = new Octane.Octane({
            server: uri,
            sharedSpace: space,
            workspace: workspace,
            user: username,
            password: (cookieName === undefined || cookieName === '') ? password : undefined,
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                ALM_OCTANE_TECH_PREVIEW: true,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                HPECLIENTTYPE: 'OCTANE_IDE_PLUGIN',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Cookie: (cookieName === undefined || cookieName === '') ? undefined : `${cookieName}=${cookie}`
            }
        });
        try {
            const result: any = await octaneInstace.get(Octane.Octane.entityTypes.workspaceUsers)
                .fields('id', 'name', 'full_name')
                .query(Query.field('name').equal(username).build())
                .execute();
            this.logger.info('Successful auth test.', result.data);
            return result.data && result.data[0] ? (result.data[0].full_name ? result.data[0].full_name : username) : username;
        } catch (e: any) {
            this.logger.error('Error while testing auth.', e);
            throw e;
        }
    }

    public storePasswordForAuthentication(password: string | undefined) {
        this.password = password;
    }

    public getPasswordForAuthentication(): string | undefined {
        return this.password;
    }

    public async initialize() {


        this.uri = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.url');
        if (this.uri !== undefined) {
            let regExp = this.uri.match(/\?p=(\d+\/\d+)/);
            if (regExp) {
                this.uri = this.uri.split(regExp[0])[0];
            }
        }
        this.space = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.space');
        this.workspace = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.workspace');
        this.user = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.user.userName');

        this.session = await vscode.authentication.getSession(AlmOctaneAuthenticationProvider.type, ['default'], { createIfNone: false }) as AlmOctaneAuthenticationSession;

        if (this.uri && this.space && this.workspace && this.user && this.session) {
            this.octane = new Octane.Octane({
                server: this.uri,
                sharedSpace: this.space,
                workspace: this.workspace,
                user: this.user,
                password: this.session.type === AlmOctaneAuthenticationType.userNameAndPassword ? this.session.accessToken : undefined,
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    ALM_OCTANE_TECH_PREVIEW: true,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    HPECLIENTTYPE: 'OCTANE_IDE_PLUGIN',
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    Cookie: this.session.type === AlmOctaneAuthenticationType.browser ? `${this.session.cookieName}=${this.session.accessToken}` : undefined
                }
            });
            const result: any = await this.octane.get(Octane.Octane.entityTypes.workspaceUsers)
                .query(Query.field('name').equal(this.user).build())
                .execute();
            this.loggedInUserId = result.data[0].id;

            {
                const result = await this.octane.get(Octane.Octane.entityTypes.transitions)
                    .fields('id', 'entity', 'logical_name', 'is_primary', 'source_phase{name}', 'target_phase{name}')
                    .execute();
                this.transitions = result.data.map((t: any) => new Transition(t));
                this.logger.log(this.transitions);
            }

        }
    }

    public async globalSearchWorkItems(subtype: string, criteria: string): Promise<OctaneEntity[]> {
        try {
            const response = await this.octane.get(Octane.Octane.entityTypes.workItems)
                .fields('name', 'story_points', 'phase', 'owner{id,name,full_name}',
                    'invested_hours', 'estimated_hours', 'remaining_hours',
                    'detected_by{id,name,full_name}', 'severity', 'author{id,name,full_name}', 'global_text_search_result')
                .query(
                    Query.field('subtype').equal(subtype).build()
                )
                .limit(`5&text_search={"type":"global","text":"${criteria}"}`)
                .execute();
            this.logger.log('Global search response', response);
            if (response.data && response.data.length) {
                let responseWithFields = await this.octane.get(Octane.Octane.entityTypes.workItems)
                    .fields('name', 'story_points', 'phase', 'owner{id,name,full_name}',
                        'invested_hours', 'estimated_hours', 'remaining_hours',
                        'detected_by{id,name,full_name}', 'severity', 'author{id,name,full_name}')
                    .query(
                        Query.field('subtype').equal(subtype)
                            .and().field('id').inComparison(response.data.map((r: any) => r.id)).build()
                    )
                    .execute();

                let entities = responseWithFields.data.map((r: any) => {
                    let gsr = response.data.find((re: { id: any; }) => re.id === r.id);
                    if (gsr && gsr.global_text_search_result) {
                        r.global_text_search_result = gsr?.global_text_search_result.description;
                    }
                    let oe = new OctaneEntity(r);
                    this.logger.log('Extended oe', oe);
                    return oe;
                });
                this.logger.log('Global search results: ', entities);
                return entities;
            }
            return [];
        } catch (e) {
            this.logger.error('While global searching work items.', e);
            return [];
        }
    }

    public async globalSearchRequirements(criteria: string): Promise<OctaneEntity[]> {
        try {
            const response = await this.octane.get(Octane.Octane.entityTypes.requirements)
                .fields('name', 'phase', 'owner{id,name,full_name}', 'author{id,name,full_name}', 'global_text_search_result')
                .query(
                    Query.field('subtype').inComparison(['requirement_document']).build()
                )
                .limit(`5&text_search={"type":"global","text":"${criteria}"}`)
                .execute();
            this.logger.log('Global search response', response);
            if (response.data && response.data.length) {
                let responseWithFields = await this.octane.get(Octane.Octane.entityTypes.requirements)
                    .fields('name', 'phase', 'owner{id,name,full_name}', 'author{id,name,full_name}')
                    .query(
                        Query.field('subtype').equal('requirement_document')
                            .and().field('id').inComparison(response.data.map((r: any) => r.id))
                            .build()
                    )
                    .execute();

                let entities = responseWithFields.data.map((r: any) => {
                    let gsr = response.data.find((re: { id: any; }) => re.id === r.id);
                    if (gsr && gsr.global_text_search_result) {
                        r.global_text_search_result = gsr?.global_text_search_result.description;
                    }
                    let oe = new OctaneEntity(r);
                    this.logger.log('Extended oe', oe);
                    return oe;
                });
                this.logger.log('Global search results: ', entities);
                return entities;
            }
            return [];
        } catch (e) {
            this.logger.error('While global searching requirements.', e);
            return [];
        }
    }

    public async globalSearchTasks(criteria: string): Promise<OctaneEntity[]> {
        try {
            const response = await this.octane.get(Octane.Octane.entityTypes.tasks)
                .fields('id', 'name', 'author{id,name,full_name}', 'owner{id,name,full_name}', 'phase', 'global_text_search_result')
                .limit(`5&text_search={"type":"global","text":"${criteria}"}`)
                .execute();
            this.logger.log('Global search response', response);
            if (response.data && response.data.length) {
                let responseWithFields = await this.octane.get(Octane.Octane.entityTypes.tasks)
                    .fields('id', 'name', 'author{id,name,full_name}', 'owner{id,name,full_name}', 'phase')
                    .query(
                        Query.field('id').inComparison(response.data.map((r: any) => r.id))
                            .build()
                    )
                    .execute();

                let entities = responseWithFields.data.map((r: any) => {
                    let gsr = response.data.find((re: { id: any; }) => re.id === r.id);
                    if (gsr && gsr.global_text_search_result) {
                        r.global_text_search_result = gsr?.global_text_search_result.description;
                    }
                    let oe = new OctaneEntity(r);
                    this.logger.log('Extended oe', oe);
                    return oe;
                });
                this.logger.log('Global search results: ', entities);
                return entities;
            }
            return [];
        } catch (e) {
            this.logger.error('While global searching tasks.', e);
            return [];
        }
    }

    public async globalSearchTests(criteria: string): Promise<OctaneEntity[]> {
        try {
            const response = await this.octane.get(Octane.Octane.entityTypes.tests)
                .fields('name', 'owner{id,name,full_name}', 'author{id,name,full_name}', 'phase', 'global_text_search_result')
                .query(
                    Query.field('subtype').inComparison(['test_manual', 'test_suite', 'gherkin_test', 'test_automated', 'scenario_test']).build()
                )
                .orderBy('id')
                .limit(`5&text_search={"type":"global","text":"${criteria}"}`)
                .execute();
            this.logger.log('Global search response', response);
            if (response.data && response.data.length) {
                let responseWithFields = await this.octane.get(Octane.Octane.entityTypes.tests)
                    .fields('name', 'owner{id,name,full_name}', 'author{id,name,full_name}', 'phase')
                    .query(
                        Query.field('subtype').inComparison(['test_manual', 'test_suite', 'gherkin_test', 'test_automated', 'scenario_test'])
                            .and().field('id').inComparison(response.data.map((r: any) => r.id)).build()
                    )
                    .execute();

                let entities = responseWithFields.data.map((r: any) => {
                    let gsr = response.data.find((re: { id: any; }) => re.id === r.id);
                    if (gsr && gsr.global_text_search_result) {
                        r.global_text_search_result = gsr?.global_text_search_result.description;
                    }
                    let oe = new OctaneEntity(r);
                    this.logger.log('Extended oe', oe);
                    return oe;
                });
                this.logger.log('Global search results: ', entities);
                return entities;
            }
            return [];
        } catch (e) {
            this.logger.error('While global searching tests.', e);
            return [];
        }
    }

    public isLoggedIn(): boolean {
        return this.loggedInUserId !== null;
    }

    private async refreshMyWork(subtype: string | string[]): Promise<OctaneEntity[]> {
        let subtypes: string[] = [];
        if (!Array.isArray(subtype)) {
            subtypes.push(subtype);
        } else {
            subtypes = subtype;
        }
        const response = await this.octane.get(Octane.Octane.entityTypes.workItems)
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
        this.logger.log(entities);
        return entities;
    }

    public static getInstance(): OctaneService {
        if (!OctaneService._instance) {
            OctaneService._instance = new OctaneService();
        }
        return OctaneService._instance;
    }

    public async getMyBacklog(): Promise<OctaneEntity[]> {
        return this.refreshMyWork(['defect', 'story', 'quality_story']);
    }

    public async getMyRequirements(): Promise<OctaneEntity[]> {
        const response = await this.octane.get(Octane.Octane.entityTypes.requirements)
            .fields('name', 'phase', 'owner{id,name,full_name}', 'author{id,name,full_name}')
            .query(
                Query.field('subtype').inComparison(['requirement_document']).and()
                    .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                    .build()
            )
            .orderBy('creation_time')
            .execute();
        this.logger.log(response);

        let entities = response.data.map((r: any) => new OctaneEntity(r));
        this.logger.log(entities);
        return entities;
    }

    public async getMyDefects(): Promise<OctaneEntity[]> {
        return this.refreshMyWork('defect');
    }

    public async getMyFeatures(): Promise<OctaneEntity[]> {
        return this.refreshMyWork('feature');
    }

    public async getMyStories(): Promise<OctaneEntity[]> {
        return this.refreshMyWork('story');
    }

    public async getMyQualityStories(): Promise<OctaneEntity[]> {
        return this.refreshMyWork('quality_story');
    }

    public async getMyTests(): Promise<OctaneEntity[]> {
        const response = await this.octane.get(Octane.Octane.entityTypes.tests)
            .fields('name', 'owner{id,name,full_name}', 'author{id,name,full_name}', 'phase')
            .query(
                Query.field('subtype').inComparison(['test_manual', 'gherkin_test', 'scenario_test']).and()
                    .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                    .build()
            )
            .orderBy('creation_time')
            .execute();
        let entities = response.data.map((r: any) => new OctaneEntity(r));
        this.logger.log(entities);
        return entities;
    }

    public async getMyTestRuns(): Promise<OctaneEntity[]> {
        const response = await this.octane.get(Octane.Octane.entityTypes.runs)
            .fields('name', 'author{id,name,full_name}', 'run_by{full_name}')
            .query(
                Query.field('subtype').inComparison(['run_manual', 'run_suite']).and()
                    .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                    .build()
            )
            .orderBy('creation_time')
            .execute();
        let entities = response.data.map((r: any) => new OctaneEntity(r));
        this.logger.log(entities);
        return entities;
    }

    public async getMyMentions(): Promise<OctaneEntity[]> {
        const response = await this.octane.get(Octane.Octane.entityTypes.comments)
            .fields('text', 'owner_work_item', 'owner_requirement', 'owner_test', 'owner_run', 'owner_bdd_spec', 'owner_task', 'author{id,name,full_name}')
            .query(
                Query.field('mention_user').equal(Query.field('id').equal(this.loggedInUserId))
                    .build()
            )
            .orderBy('creation_time')
            .execute();
        let entities = response.data.map((r: any) => new Comment(r));
        this.logger.log(entities);
        return entities;
    }

    public async getMyTasks(): Promise<OctaneEntity[]> {
        const response = await this.octane.get(Octane.Octane.entityTypes.tasks)
            .fields('id', 'name', 'author{id,name,full_name}', 'owner{id,name,full_name}', 'phase', 'story')
            .query(
                Query.field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                    .build()
            )
            .orderBy('creation_time')
            .execute();
        let entities = response.data.map((r: any) => new Task(r));
        this.logger.log(entities);
        return entities;
    }

    public async getCommentsForEntity(entity: OctaneEntity): Promise<Comment[] | undefined> {
        if (!entity || !entity.id) {
            return;
        }
        try {
            const response = await this.octane.get(Octane.Octane.entityTypes.comments)
                .fields('id', 'author', 'owner_work_item', 'owner_requirement', 'owner_test', 'owner_run', 'owner_bdd_spec', 'owner_task', 'creation_time', 'text')
                .query(
                    Query.field(`owner_${entity.type}`).equal(Query.field('id').equal(entity.id))
                        .build()
                )
                .execute();
            let entities = response.data.map((r: any) => new Comment(r));
            return entities;
        } catch (e) {
            this.logger.error('While retreiving comment: ', e);
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
                    this.logger.error('While saving comment: ', error);
                    vscode.window.showErrorMessage((error.response.body.description) ?? 'We couldn’t save your comment.');
                });
        }
    }

    private async getRemoteFieldsForType(type: string) {
        try {
            const result = await this.octane.get(Octane.Octane.entityTypes.fieldsMetadata)
                .query(Query.field('entity_name').inComparison([type])
                    .and()
                    .field('visible_in_ui').equal('true')
                    // .and()
                    // .field('deprecated').equal(Query.NULL)
                    .build())
                .execute();

            result.data.forEach((element: any) => {
                setValueForMap(this.octaneMap, element.entity_name, element);
            });
        } catch (e) {
            this.logger.error('While fetching remote fields.', e);
        }
    }

    public async getFieldsForType(type: string) {
        if (!this.octaneMap.get(type) || !this.octaneMap.get(type)?.length) {
            await this.getRemoteFieldsForType(type);
        }
        // logger.log('Application modules: ', this.octaneMap.get(type)?.filter(f => f.name === 'application_modules'));
        return this.octaneMap.get(type);
    }

    public async getDataFromOctaneForTypeAndId(type: string | undefined, subType: string | undefined, id: string) {
        const octaneType = subType || type;
        if (!octaneType) {
            return;
        }
        const fields = await this.getFieldsForType(octaneType);
        if (!fields) {
            this.logger.error(`Could not determine fields for type ${octaneType}.`);
            return;
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
            this.logger.log("transitions----", transitions);
            return transitions;
        }
        return [];
    }

    public async updateEntity(type: string | undefined, subType: string | undefined, body: any) {
        this.logger.debug("update", body);
        const apiEntityType = type || subType;
        if (!apiEntityType) {
            return;
        }
        const endPoint = entityTypeApiEndpoint.get(apiEntityType);
        if (!endPoint) {
            return;
        }
        let entity = await this.octane.get(endPoint).at(body.id).execute();
        this.octane.update(endPoint, body).execute()
            .then((res: any) => {
                vscode.window.showInformationMessage('Your item changes have been saved.');
            }, (error: any) => {
                this.logger.error('While updating entity: ', error);
                vscode.window.showErrorMessage((error.response.body.description) ?? 'We couldn’t save your changes');
            });
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
            if (entityTypes === 'product_area') {
                const result = await this.octane.get(endPoint)
                    .execute();
                this.logger.log('application_modules', result);
                return result ?? undefined;
            }
            if (entityTypes === 'sprint' && fullData['release']) {
                const result = await this.octane.get(endPoint)
                    .query(
                        Query.field('release').equal(Query.field('id').equal(fullData['release'].id))
                            .build())
                    .execute();
                return result ?? undefined;
            } else {
                const result = await this.octane.get(endPoint)
                    .execute();
                return result ?? undefined;
            }
        } catch (e) {
            this.logger.error('While getting full data for entity ()', e);
        }
    }

    public async downloadScriptForTest(e: OctaneEntity): Promise<string> {
        try {
            const script = await this.octane.get(Octane.Octane.entityTypes.tests).at(e.id).script().execute();
            return script.script;
        } catch (e) {
            this.logger.error('While downloading script.', e);
            throw e;
        }
    }

    public async addToMyWork(e: OctaneEntity): Promise<void> {
        try {
            if (!this.loggedInUserId) {
                return;
            }
            // let type = e.subtype ? e.subtype : e.type;
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

            this.octane.create(Octane.Octane.entityTypes.userItems, entityModel).execute()
                .then((res: any) => {
                    vscode.window.showInformationMessage('Your item changes have been saved.');
                }, (error: any) => {
                    this.logger.error('While adding to MyWork.', e);
                    vscode.window.showErrorMessage((error.response.body.description) ?? 'We couldn’t save your changes.');
                });
        } catch (e) {
            this.logger.error('While adding to MyWork.', e);
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

                if (this.uri && this.space && this.workspace && this.user && this.session) {
                    var myHeaders = new Headers();
                    myHeaders.append('ALM_OCTANE_TECH_PREVIEW', 'true');
                    myHeaders.append('HPECLIENTTYPE', 'OCTANE_IDE_PLUGIN');
                    if (this.session.type === AlmOctaneAuthenticationType.browser) {
                        myHeaders.append('Cookie', `${this.session.cookieName}=${this.session.accessToken}`);
                    } else {
                        myHeaders.set('Authorization', 'Basic ' + Buffer.from(this.user + ":" + this.session.accessToken).toString('base64'));
                    }
                    myHeaders.append('Content-Type', 'application/json');

                    let entityModel: string = JSON.stringify({
                        id: `${e.id}`
                    });

                    var requestOptions: RequestInit = {
                        method: 'PUT',
                        headers: myHeaders,
                        body: entityModel,
                        redirect: 'follow'
                    };

                    await fetch(`${this.uri}internal-api/shared_spaces/${this.space}/workspaces/${this.workspace}/comments/${e.id}/dismiss`, requestOptions)
                        .then(response => response.text())
                        .then(result => this.logger.log(result))
                        .catch(error => this.logger.log('error', error));


                    // await this.octane.update(Octane.Octane.entityTypes.comments, entityModel).at(`${e.id}/dismiss`)
                    //     .execute()
                    //     .then((res: any) => {
                    //         vscode.window.showInformationMessage('Item dismissed.');
                    //     }, (error: any) => {
                    //         vscode.window.showErrorMessage('Item dismissal failed.' + error);
                    //     });
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

                await this.octane.delete(Octane.Octane.entityTypes.userItems)
                    .query(Query.field(field).equal(Query.field('id').equal(e.id))
                        .and()
                        .field('user').equal(Query.field('id').equal(this.loggedInUserId))
                        .and()
                        .field('entity_type').equal(type)
                        .build())
                    .execute()
                    .then((res: any) => {
                        vscode.window.showInformationMessage('Item dismissed.');
                    }, (error: any) => {
                        vscode.window.showErrorMessage((error.response.body.description) ?? 'Item dismissal failed');
                    });
            }
        } catch (e) {
            this.logger.error('While dismissing entity from MyWork.', e);
            throw e;
        }
    }

    public getBrowserUri(entity: any): vscode.Uri {
        return vscode.Uri.parse(`${this.uri}ui/?p=${this.space}%2F${this.workspace}#/entity-navigation?entityType=${entity.type}&id=${entity.id}`);
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
    ['application_module', Octane.Octane.entityTypes.applicationModules],
    ['attachment', Octane.Octane.entityTypes.applicationModules],
    ['automated_run', Octane.Octane.entityTypes.automatedRuns],
    ['ci_build', Octane.Octane.entityTypes.ciBuilds],
    ['comment', Octane.Octane.entityTypes.comments],
    ['defect', Octane.Octane.entityTypes.defects],
    ['epic', Octane.Octane.entityTypes.epics],
    ['feature', Octane.Octane.entityTypes.features],
    ['gherkin_test', Octane.Octane.entityTypes.gherkinTest],
    ['list_node', Octane.Octane.entityTypes.listNodes],
    ['manual_run', Octane.Octane.entityTypes.manualRuns],
    ['manualTest', Octane.Octane.entityTypes.manualTests],
    ['metaphase', Octane.Octane.entityTypes.metaphases],
    ['milestone', Octane.Octane.entityTypes.milestones],
    ['phase', Octane.Octane.entityTypes.phases],
    ['pipeline_node', Octane.Octane.entityTypes.pipelineNodes],
    ['pipeline_run', Octane.Octane.entityTypes.pipelineRuns],
    ['previous_run', Octane.Octane.entityTypes.previousRuns],
    ['program', Octane.Octane.entityTypes.programs],
    ['release', Octane.Octane.entityTypes.releases],
    ['requirement_document', Octane.Octane.entityTypes.requirementDocuments],
    ['requirement_folder', Octane.Octane.entityTypes.requirementFolders],
    ['requirement_root', Octane.Octane.entityTypes.requirementRoots],
    ['requirement', Octane.Octane.entityTypes.requirements],
    ['role', Octane.Octane.entityTypes.roles],
    ['run_step', Octane.Octane.entityTypes.runSteps],
    ['run', Octane.Octane.entityTypes.runs],
    ['scm_commit', Octane.Octane.entityTypes.scmCommits],
    ['sprint', Octane.Octane.entityTypes.sprints],
    ['story', Octane.Octane.entityTypes.stories],
    ['suite_run', Octane.Octane.entityTypes.suiteRun],
    ['task', Octane.Octane.entityTypes.tasks],
    ['taxonomy_category_node', Octane.Octane.entityTypes.taxonomyCategoryNodes],
    ['taxonomy_item_node', Octane.Octane.entityTypes.taxonomyItemNodes],
    ['taxonomy_node', Octane.Octane.entityTypes.taxonomyNodes],
    ['team_sprint', Octane.Octane.entityTypes.teamSprints],
    ['team', Octane.Octane.entityTypes.teams],
    ['test_suite_link_to_automated_test', Octane.Octane.entityTypes.testSuiteLinkToAutomatedTests],
    ['test_suite_link_to_gherkin_test', Octane.Octane.entityTypes.testSuiteLinkToGherkinTests],
    ['test_suite_link_to_manual_test', Octane.Octane.entityTypes.testSuiteLinkToManualTests],
    ['test_suite_link_to_test', Octane.Octane.entityTypes.testSuiteLinkToTests],
    ['test_suite', Octane.Octane.entityTypes.testSuites],
    ['test', Octane.Octane.entityTypes.tests],
    ['transition', Octane.Octane.entityTypes.transitions],
    ['user_item', Octane.Octane.entityTypes.userItems],
    ['user_tag', Octane.Octane.entityTypes.userTags],
    ['user', Octane.Octane.entityTypes.users],
    ['work_item_root', Octane.Octane.entityTypes.workItemRoots],
    ['work_item', Octane.Octane.entityTypes.workItems],
    ['workspace_role', Octane.Octane.entityTypes.workspaceRoles],
    ['workspace_user', Octane.Octane.entityTypes.workspaceUsers],
    ['quality_story', Octane.Octane.entityTypes.qualityStories],
    ['bdd_spec', 'bdd_specs']
]);

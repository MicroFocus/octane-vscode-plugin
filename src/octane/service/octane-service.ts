import * as vscode from 'vscode';
import * as Octane from '@microfocus/alm-octane-js-rest-sdk';
import * as Query from '@microfocus/alm-octane-js-rest-sdk/lib/query';
import { OctaneEntity } from '../model/octane-entity';
import { Transition } from '../model/transition';
import { Comment } from '../model/comment';
import { AlmOctaneAuthenticationProvider, AlmOctaneAuthenticationSession, AlmOctaneAuthenticationType } from '../../auth/authentication-provider';

export class OctaneService {

    private static _instance: OctaneService;

    private octane?: any;

    private user?: String;
    private loggedInUserId?: number;
    private transitions?: Transition[];
    private phases = new Map<string, string>();

    private octaneMap = new Map<String, any[]>();

    public async testAuthentication(uri: string, space: string | undefined, workspace: string | undefined, username: string, password: string | undefined, cookieName: string | undefined, cookie: string | undefined): Promise<string | undefined> {
        const octaneInstace = new Octane.Octane({
            server: uri,
            sharedSpace: space,
            workspace: workspace,
            user: username,
            password: cookie !== undefined ? undefined : password,
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                ALM_OCTANE_TECH_PREVIEW: true,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Cookie: cookie !== undefined ? `${cookieName}=${cookie}` : undefined
            }
        });
        try {
            const result: any = await octaneInstace.get(Octane.Octane.entityTypes.workspaceUsers)
                .query(Query.field('name').equal(username).build())
                .execute();
            console.info('Successful auth test.');
            return result.data[0].full_name;
        } catch (e) {
            console.error('Error while testing auth.', e);
            return;
        }
    }

    public async initialize() {

        const uri = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.uri');
        const space = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.space');
        const workspace = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.workspace');
        this.user = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.user.userName');

        const session = await vscode.authentication.getSession(AlmOctaneAuthenticationProvider.type, ['default'], { createIfNone: false }) as AlmOctaneAuthenticationSession;

        if (uri && space && workspace && this.user && session) {
            this.octane = new Octane.Octane({
                server: uri,
                sharedSpace: space,
                workspace: workspace,
                user: this.user,
                password: session.type === AlmOctaneAuthenticationType.userNameAndPassword ? session.accessToken : undefined,
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    ALM_OCTANE_TECH_PREVIEW: true,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    Cookie: session.type === AlmOctaneAuthenticationType.browser ? `${session.cookieName}=${session.accessToken}` : undefined
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
                console.log(this.transitions);
            }

        }
    }

    public isLoggedIn(): boolean {
        return this.loggedInUserId !== null;
    }

    private async refreshMyWork(subtype: String | String[]): Promise<OctaneEntity[]> {
        let subtypes: String[] = [];
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
            .execute();
        let entities = response.data.map((r: any) => new OctaneEntity(r));
        console.log(entities);
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
            .execute();
        console.log(response);

        let entities = response.data.map((r: any) => new OctaneEntity(r));
        console.log(entities);
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
            .execute();
        let entities = response.data.map((r: any) => new OctaneEntity(r));
        console.log(entities);
        return entities;
    }

    public async getMyMentions(): Promise<OctaneEntity[]> {
        const response = await this.octane.get(Octane.Octane.entityTypes.comments)
            .fields('text', 'owner_work_item', 'author{id,name,full_name}')
            .query(
                Query.field('mention_user').equal(Query.field('id').equal(this.loggedInUserId))
                    .build()
            )
            .execute();
        let entities = response.data.map((r: any) => new Comment(r));
        console.log(entities);
        return entities;
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
            console.error('While fetching remote fields.', e);
        }
    }

    public async getFieldsForType(type: string) {
        if (!this.octaneMap.get(type)) {
            await this.getRemoteFieldsForType(type);
        }
        return this.octaneMap.get(type);
    }

    public async getDataFromOctaneForTypeAndId(type: string | undefined, subType: string | undefined, id: string) {
        const octaneType = subType || type;
        if (!octaneType) {
            return;
        }
        const fields = await this.getFieldsForType(octaneType);
        if (!fields) {
            console.error(`Could not determine fields for type ${octaneType}.`);
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
            console.log("transitions----", transitions);
            return transitions;
        }
        return [];
    }

    public async updateEntity(type: string | undefined, subType: string | undefined, body: any) {
        console.log("update", body);
        const apiEntityType = subType || type;
        if (!apiEntityType) {
            return;
        }
        const endPoint = entityTypeApiEndpoint.get(apiEntityType);
        if (!endPoint) {
            return;
        }
        let entity = await this.octane.get(endPoint).at(body.id).execute();
        this.octane.update(endPoint, body).execute().then(undefined, console.error);
    }

    public async getFullDataForEntity(entityTypes: string, field: any) {
        const endPoint = entityTypeApiEndpoint.get(entityTypes);
        if (!endPoint) {
            return;
        }
        try {
            if (field.field_type_data.targets[0].logical_name) {
                const result = await this.octane.get(endPoint)
                    .query(
                    Query.field('id').equal(field.field_type_data.targets[0].logical_name)
                    .build())
                    .execute();
                return result ?? undefined;
            } else {
                const result = await this.octane.get(endPoint)
                    .execute();
                return result ?? undefined;
            }
        } catch (e) {
            console.error('While getFullDataForEntity()', e);
        }
    }

    public async downloadScriptForTest(e: OctaneEntity): Promise<string> {
        try {
            const script = await this.octane.get(Octane.Octane.entityTypes.tests).at(e.id).script().execute();
            return script.script;
        } catch (e) {
            console.error('While downloading script.', e);
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



const entityTypeApiEndpoint: Map<String, String> = new Map([
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
    ['quality_story', Octane.Octane.entityTypes.qualityStories]
]);

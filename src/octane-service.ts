import * as vscode from 'vscode';
import * as Octane from '@microfocus/alm-octane-js-rest-sdk';
import * as Query from '@microfocus/alm-octane-js-rest-sdk/lib/query';
import { stripHtml } from 'string-strip-html';
import { runInNewContext } from 'vm';

export class OctaneService {

    private static _instance: OctaneService;

    private octane?: any;

    private user?: String;
    private loggedInUserId?: number;
    private metaphases?: Metaphase[];

    private octaneMap = new Map<String, any[]>();

    public async initialize() {
        const uri = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.uri');
        const space = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.space');
        const workspace = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.server.workspace');
        this.user = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.user.userName');
        const password = vscode.workspace.getConfiguration().get('visual-studio-code-plugin-for-alm-octane.user.password');
        if (uri && space && workspace && this.user && password) {
            this.octane = new Octane.Octane({
                server: uri,
                sharedSpace: space,
                workspace: workspace,
                user: this.user,
                password: password
            });
            const result: any = await this.octane.get(Octane.Octane.entityTypes.workspaceUsers)
                .query(Query.field('name').equal(this.user).build())
                .execute();
            this.loggedInUserId = result.data[0].id;

            {
                const result = await this.octane.get(Octane.Octane.entityTypes.metaphases)
                    .fields('id', 'name', 'phase')
                    .execute();
                this.metaphases = result.data.map((m: any) => new Metaphase(m));
                console.log(this.metaphases);
            }

            vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myBacklog.refreshEntry');
            vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myTests.refreshEntry');
            vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myMentions.refreshEntry');
            vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myFeatures.refreshEntry');
            vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myRequirements.refreshEntry');
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
            .fields('name', 'story_points', 'phase', 'owner',
                'invested_hours', 'estimated_hours', 'remaining_hours',
                'detected_by', 'severity', 'author', 'detected_by')
            .query(
                Query.field('subtype').inComparison(subtypes).and()
                    .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                    .build()
            )
            .execute();
        console.log(response);

        let entities = [];
        for (let i = 0; i < response.data.length; i++) {
            let entity = new OctaneEntity(response.data[i]);
            entity.owner = (await this.getUserFromEntity(entity.owner));
            entity.author = (await this.getUserFromEntity(entity.author));
            entity.detectedBy = (await this.getUserFromEntity(entity.detectedBy));
            entities.push(entity);
        };
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
            .fields('name', 'phase', 'owner', 'author')
            .query(
                Query.field('subtype').inComparison(['requirement_document']).and()
                    .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                    .build()
            )
            .execute();
        console.log(response);

        let entities = [];
        for (let i = 0; i < response.data.length; i++) {
            let entity = new OctaneEntity(response.data[i]);
            entity.owner = (await this.getUserFromEntity(entity.owner));
            entity.author = (await this.getUserFromEntity(entity.author));
            entity.detectedBy = (await this.getUserFromEntity(entity.detectedBy));
            entities.push(entity);
        };
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
            .fields('name', 'owner', 'author', 'phase')
            .query(
                Query.field('subtype').inComparison(['test_manual', 'gherkin_test', 'scenario_test']).and()
                    .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                    .build()
            )
            .execute();
        let entities = [];
        for (let i = 0; i < response.data.length; i++) {
            let entity = new OctaneEntity(response.data[i]);
            entity.owner = (await this.getUserFromEntity(entity.owner));
            entity.author = (await this.getUserFromEntity(entity.author));
            entities.push(entity);
        };
        console.log(entities);
        return entities;
    }

    public async getMyMentions(): Promise<OctaneEntity[]> {
        const response = await this.octane.get(Octane.Octane.entityTypes.comments)
            .fields('text', 'owner_work_item', 'author')
            .query(
                Query.field('mention_user').equal(Query.field('id').equal(this.loggedInUserId))
                    .build()
            )
            .execute();
        let entities = [];
        for (let i = 0; i < response.data.length; i++) {
            let entity = new Comment(response.data[i]);
            entity.author = (await this.getUserFromEntity(entity.author));
            entities.push(entity);
        };
        console.log(entities);
        return entities;
    }

    public getPhaseLabel(phase: OctaneEntity): string {
        if (this.metaphases) {
            const label = this.metaphases.filter(m => (m.phase && m.phase.filter(p => p.id === phase.id)))[0].name;
            return label ? label : '';
        }
        return '';
    }

    public async getUserFromEntity(user: User | undefined): Promise<User | undefined> {
        if (!user) {
            return;
        }
        const response = await this.octane.get(Octane.Octane.entityTypes.workspaceUsers)
            .fields('full_name')
            .at(user.id)
            .execute();
        return new User(response);
    }

    private async getRemoteFieldsForType(type: string) {
        const result = await this.octane.get(Octane.Octane.entityTypes.fieldsMetadata)
            .query(Query.field('entity_name').inComparison([type])
                .and()
                .field('visible_in_ui').equal('true')
                .build())
            .execute();

        result.data.forEach((element: any) => {
            setValueForMap(this.octaneMap, element.entity_name, element);
        });
    }

    public async getFieldsForType(type: string) {
        if (!this.octaneMap.get(type)) {
            await this.getRemoteFieldsForType(type);
        }
        return this.octaneMap.get(type);
    }

    public async getDataFromOctaneForTypeAndId(type: string, id: string) {
        const fields = await this.getFieldsForType(type);
        if (!fields) {
            console.error(`Could not determine fields for type ${type}.`);
            return;
        }
        const result = await this.octane.get(Octane.Octane.entityTypes.workItems)
            .fields(
                fields.map((f: any) => f.name)
            )
            .at(id)
            .execute();
        return await this.fillEntityWithReferences(result);
    }

    public async fillEntityWithReferences(data: any): Promise<OctaneEntity> {
        if (!data.subtype) {
            return data;
        }
        const fields = await this.getFieldsForType(data.subtype);
        if (!fields) {
            return data;
        }

        const references = fields.filter(f => f.field_type === 'reference');
        console.log('references=', references);
        for (const r of references) {
            console.log("Field: ", r.name, "; value: ", data[r.name]);
            if (data[r.name]) {
                const endPoint = entityTypeApiEndpoint.get(data[r.name].type);
                if (endPoint) {
                    const fields = entityTypeAndDefaultFields.get(data[r.name].type);
                    const value = await this.octane.get(endPoint)
                        .fields(fields ? fields : 'name')
                        .at(data[r.name].id)
                        .execute();
                    data[r.name] = value;
                }
            }
        };
        console.log('Fulldata: ', data);
        return data;
    }
}

export class OctaneEntity {

    public id: string;
    public type?: string;
    public name?: string;
    public storyPoints?: string;
    public phase?: OctaneEntity | OctaneEntity[];
    public references?: OctaneEntity[];
    public owner?: User;
    public investedHours?: string;
    public remainingHours?: string;
    public estimatedHours?: string;
    public detectedBy?: User;
    public severity?: string;
    public subtype?: string;
    public author?: User;
    constructor(i?: any) {
        this.id = (i && i.id) ? i.id : null;
        this.type = (i && i.type) ? i.type : null;
        this.name = (i && i.name) ? i.name : null;
        this.storyPoints = (i && i.story_points) ? i.story_points : null;
        this.investedHours = i?.invested_hours ?? null;
        this.remainingHours = i?.remaining_hours ?? null;
        this.estimatedHours = i?.estimated_hours ?? null;
        this.detectedBy = new User(i?.detected_by);
        this.severity = i?.severity?.id ?? null;
        this.owner = new User(i?.owner);
        this.author = new User(i?.author);
        if (i.phase) {
            if (i.phase.data) {
                this.phase = i.phase.data.map((ref: any) => new OctaneEntity(ref));
            } else {
                this.phase = new OctaneEntity(i.phase);
            }
        }
        this.subtype = i?.subtype ?? '';
    }
}

export class User {

    public id: string;
    public fullName?: string;

    constructor(i?: any) {
        this.id = i?.id ?? null;
        this.fullName = i?.full_name ?? '';
    }

}

export class Metaphase extends OctaneEntity {

    public phase?: OctaneEntity[];

}

export class Comment extends OctaneEntity {

    public text: string;

    constructor(i?: any) {
        super(i);
        this.text = (i && i.text) ? i.text : '';
    }

    getStrippedText(): string {
        return stripHtml(this.text).result;
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

const entityTypeAndDefaultFields: Map<String, String> = new Map([
    ['user', 'full_name'],
    ['workspace_user', 'full_name'],
]);
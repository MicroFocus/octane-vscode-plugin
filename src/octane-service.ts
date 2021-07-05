import * as vscode from 'vscode';
import * as Octane from '@microfocus/alm-octane-js-rest-sdk';
import * as Query from '@microfocus/alm-octane-js-rest-sdk/lib/query';
import { stripHtml } from 'string-strip-html';

export class OctaneService {

    private static _instance: OctaneService;

    private octane?: any;

    private user?: String;
    private loggedInUserId?: number;
    private metaphases?: Metaphase[];

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

            {
                const result = await this.octane.get(Octane.Octane.entityTypes.fieldsMetadata)
                    .query(Query.field('entity_name').inComparison(['feature', 'defect', 'story', 'quality_story', 'test_manual','gherkin_test','scenario_test']).build())
                    .execute();
                console.log(result.data.map((p: { name: any; }) => p.name));
            }

            vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myBacklog.refreshEntry');
            vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myTests.refreshEntry');
            vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myMentions.refreshEntry');
            vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myFeatures.refreshEntry');
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
        let entities = [];
        for(let i = 0; i < response.data.length; i++) {
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
                Query.field('subtype').inComparison(['test_manual','gherkin_test','scenario_test']).and()
                    .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                    .build()
            )
            .execute();
        let entities = [];
        for(let i = 0; i < response.data.length; i++) {
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
        for(let i = 0; i < response.data.length; i++) {
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

    public async getUserFromEntity (user: User | undefined): Promise<User> {
        const response = await this.octane.get(Octane.Octane.entityTypes.workspaceUsers)
        .fields('full_name')    
        .at(user?.id)
        .execute();
        return response;
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
        this.detectedBy = i?.detected_by ?? null;
        this.severity = i?.severity?.id ?? null;
        this.owner = i?.owner ?? null;
        this.author = i?.author ?? null;
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
    public full_name?: string;

    constructor(i?: any) {
        this.id = i?.id ?? null;
        this.full_name = i?.full_name ?? '';
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


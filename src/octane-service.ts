import * as vscode from 'vscode';
import * as Octane from '@microfocus/alm-octane-js-rest-sdk';
import * as Query from '@microfocus/alm-octane-js-rest-sdk/lib/query';

export class OctaneService {

    private static _instance: OctaneService;

    private octane?;
    private user?: String;
    private loggedInUserId?: number;

    private entities: OctaneEntity[] = [];

    private constructor() {
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
            this.initialize();
        }
    }

    private async initialize() {
        const result = await this.octane.get(Octane.Octane.entityTypes.workspaceUsers)
            .query(Query.field('name').equal(this.user).build())
            .execute();
        this.loggedInUserId = result.data[0].id;

        this.entities = await this.getMyWork();

        vscode.commands.executeCommand('visual-studio-code-plugin-for-alm-octane.myWork.refreshEntry');
    }

    public isLoggedIn(): boolean {
        return this.loggedInUserId !== null;
    }

    private async getMyWork(): Promise<OctaneEntity[]> {
        const response = await this.octane.get(Octane.Octane.entityTypes.workItems)
            .fields('name')
            .query(
                Query.field('subtype').inComparison(['defect', 'story', 'quality_story']).and()
                .field('user_item').equal(Query.field('user').equal(Query.field('id').equal(this.loggedInUserId)))
                .build()
            )
            .execute();
        return response.data.map((i: any) => new OctaneEntity(i));
    }

    public static getInstance(): OctaneService {
        if (!OctaneService._instance) {
            OctaneService._instance = new OctaneService();
        }
        return OctaneService._instance;
    }

    public getMyDefects(): OctaneEntity[] {
        return this.getFilteredEntities('defect');
    }

    public getMyStories(): OctaneEntity[] {
        return this.getFilteredEntities('story');
    }

    public getMyQualityStories(): OctaneEntity[] {
        return this.getFilteredEntities('quality_story');
    }

    private getFilteredEntities(type: String): OctaneEntity[] {
        return this.entities.filter((e, i, a) => e.type === type);
    }
}

export class OctaneEntity {

    public id: number;
    public type?: string;
    public name?: string;

    constructor(i?: any) {
        this.id = (i && i.id) ? i.id : null;
        this.type = (i && i.type) ? i.type : null;
        this.name = (i && i.name) ? i.name : null;
    }
}
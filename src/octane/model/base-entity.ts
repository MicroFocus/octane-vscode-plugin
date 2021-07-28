export class BaseEntity {

    public id: string;
    public type?: string;
    public name?: string;

    constructor(i?: any) {
        this.id = i?.id ?? '';
        this.type = i?.type;
        this.name = i?.name;
    }
}

import { BaseEntity } from "./base-entity";

export class User extends BaseEntity {

    public fullName?: string;

    constructor(i?: any) {
        super(i);
        this.fullName = i?.full_name ?? '';
    }

}

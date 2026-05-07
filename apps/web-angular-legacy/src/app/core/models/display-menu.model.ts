export enum MenuTypeEnum {
    All,
    Admin,
    Public
}

export class DisplayMenuModel {
    constructor(
        readonly type: MenuTypeEnum,
        readonly newValue: boolean
        ) {}
}

export class FuneralCreateByMemorialIdModel {
    constructor(
        readonly id: number,
        readonly createDate: Date
    ) {}
}

class FuneralUserModel {
    constructor(
        readonly userId: string,
        readonly identity: string,
    ) {}
}

export class FuneralModel {
    constructor(
        readonly id: number,
        readonly memorialId: number,
        readonly content: string,
        readonly createDate: Date,
        readonly updateDate: Date,
        readonly userInfo: FuneralUserModel
    ) {}
}
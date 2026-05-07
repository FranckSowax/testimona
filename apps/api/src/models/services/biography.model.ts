import { Relative } from "@prisma/client";

export class BiographyCreateByMemorialIdModel {
    constructor(
        readonly id: number,
        readonly createDate: Date
    ) {}
}

class RelativeUserModel {
    constructor(
        readonly identity: string,
        readonly relation: Relative
    ) {}
}

export class BiographyModel {
    constructor(
        readonly id: number,
        readonly memorialId: number,
        readonly nicknames: string,
        readonly homeCity: string,
        readonly placesLived: string,
        // readonly relatives: RelativeUserModel[],
        readonly religion: string,
        readonly education: string,
        readonly work: string,
        readonly hobbies: string
    ) {}
}
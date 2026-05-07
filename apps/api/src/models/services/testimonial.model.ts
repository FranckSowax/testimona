import { Relative } from ".prisma/client";
import { PhotoUrlResponseModel } from "../responses/photo.model";

export class TestimonialCreateByMemorialIdModel {
    constructor(
        readonly id: number,
        readonly createDate: Date
    ) {}
}

class TestimonialUserModel {
    constructor(
        readonly userId: string,
        readonly identity: string,
        readonly relationship: Relative,
        readonly photos: Array<PhotoUrlResponseModel> | undefined
    ) {}
}

export class TestimonialModel {
    constructor(
        readonly id: number,
        readonly content: string,
        readonly numberOfLike: number,
        readonly userLiked: boolean,
        readonly photos: Array<PhotoUrlResponseModel> | undefined,
        readonly createDate: Date | null,
        readonly updateDate: Date | null,
        readonly userInfo: TestimonialUserModel | null
    ) {}
}

export class MyTestimonialModel {
    constructor(
        readonly id: number,
        readonly content: string,
        readonly numberOfLike: number,
        readonly createDate: Date | null,
        readonly memorialInfo: {
            readonly id: number,
            readonly url: string,
            readonly firstname: string,
            readonly lastname: string
        },
        readonly userInfo: TestimonialUserModel
    ) {}
}
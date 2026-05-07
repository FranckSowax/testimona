class PhotoUserServiceModel {
    constructor(readonly userId: string, readonly identity: string) {}
}

export class PhotoServiceModel {
    constructor(
        readonly photoId: string,
        readonly urls: {
            readonly circle: string,
            readonly thumbnail: string,
            readonly medium: string,
            readonly full: string
        },
        readonly createdDate: Date,
        readonly userInfos: PhotoUserServiceModel
    ) {}
}
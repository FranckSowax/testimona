import { AccessMode, DeliveryType, ImageFormat } from "cloudinary";

export class CloudinaryUploadPhotoResultModel {
    constructor(
        readonly assetId: string,
        readonly publicId: string,
        readonly version: number,
        readonly format: ImageFormat,
        readonly size: number,
        readonly type: DeliveryType,
        readonly url: string,
        readonly path: string,
        readonly accessMode: AccessMode,
        readonly createdAt: Date,
    ) {}
}

export class DeleteDbPhotoResultModel {
    constructor(
        readonly assetId: string,
        readonly publicId: string,
        readonly path: string
    ) {}
}

export class DeletePhotoResponseModel {
    constructor(
        readonly photoId: string,
        readonly isDeleted: boolean
    ) {}
}

class PhotoUserModel {
    constructor(readonly userId: string, readonly identity: string) {}
}

export class PhotoUrlResponseModel {
    constructor(
        readonly photoId: string,
        readonly urls: {
            readonly circle: string,
            readonly thumbnail: string,
            readonly medium: string,
            readonly full: string
        },
        readonly objectId: string,
        readonly createdDate: Date,
        readonly userInfos: PhotoUserModel | null
    ) {}
}
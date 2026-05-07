import { MediaObjectType } from "@prisma/client";
import { UploadFileDataModel, UploadFilePreviousData } from "../common/common.model";

export class UploadPhotoRequestModel {
    constructor(
        readonly objectId: number,
        readonly objectType: MediaObjectType,
        readonly previousFilesData: UploadFilePreviousData[],
        readonly files: UploadFileDataModel[]
    ) {}
}

export class DeletePhotoRequestModel {
    constructor(
        readonly photoIds: string[]
    ) {}
}

export interface UpdatePhotoRequestModel {
    readonly objectId: number,
    readonly objectType: MediaObjectType,
    readonly photosToDeleteIds: string | undefined,
    files: UploadFileDataModel[] | undefined,
}

export class UploadFileDataModel {
    constructor(
        public previousName: string,
        readonly originalname: string,
        readonly mimetype: string,
        readonly path: string
    ) {}
}

export class UploadFilePreviousData {
    constructor(
        readonly previousName: string
    ) {}
}

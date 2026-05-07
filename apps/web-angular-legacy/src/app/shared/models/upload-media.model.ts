export enum UploadMediaType {
    Photo = 'Photo',
    Video = 'Video'
}

export enum UploadObjectType {
    Chapter = 'Chapter',
    MemorialBackground = 'MemorialBackground',
    MemorialProfile = 'MemorialProfile',
    Photo = 'Photo',
    Testimonial = 'Testimonial'
}

export class UploadRequestModel {
    constructor(
        readonly uploadMediaData: any
    ) {}
}
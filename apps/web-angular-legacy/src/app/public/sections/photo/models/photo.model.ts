import { UserInfoModelPhoto } from "src/app/shared/models/user-info.model";

export class PhotoCreateAnswerModel {
  constructor(
    readonly url: string
  ) {}
}

export class PhotoModel {
  constructor(
    readonly createdDate: string,
    readonly photoId: string,
    readonly urls: {
      readonly medium: string,
      readonly full: string
    },
    readonly numberOfLike: number,
    readonly userLiked: boolean,
    readonly userInfos: UserInfoModelPhoto,
  ) { }
}

export class PhotoModelMemorialPicture {
  constructor(
    readonly createdDate: string,
    readonly photoId: string,
    readonly urls: {
      readonly circle: string,
      readonly thumbnail: string,
      readonly medium: string,
      readonly full: string
    },
    readonly userInfos: UserInfoModelPhoto,
  ) { }
}

export class PhotoObjectModel {
  constructor(
    readonly createdDate: string,
    readonly photoId: string,
    readonly thumbnail: string,
    readonly medium: string,
    readonly full: string
  ) { }
}

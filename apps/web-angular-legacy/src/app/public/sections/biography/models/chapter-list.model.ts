import { UserInfoMinimalModel } from "src/app/shared/models/user-info-minimal.model";
import { PhotoObjectModel } from "../../photo/models/photo.model";

export class ChapterListModel {
  constructor(
    readonly id: number,
    readonly memorialId: number,
    readonly title: string,
    readonly content: string,
    readonly createDate: string,
    readonly updateDate: string,
    readonly userInfo: UserInfoMinimalModel,
    readonly photoArray: Array<PhotoObjectModel>
  ) { }
}

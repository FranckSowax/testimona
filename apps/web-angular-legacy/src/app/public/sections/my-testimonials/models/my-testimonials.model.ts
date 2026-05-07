import { UserInfoModel } from "src/app/shared/models/user-info.model";
import { MemorialMinimalModel } from "../../home/models/memorial.model";

export class MyTestimonialsModel {
  constructor(
    readonly id: number,
    readonly content: string,
    readonly numberOfLike: number,
    readonly createDate: Date | null,
    readonly memorialInfo: MemorialMinimalModel,
    readonly userInfo: UserInfoModel
  ) { }
}

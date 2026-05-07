import { UserInfoModel } from "src/app/shared/models/user-info.model";

export class FuneralModel {
  constructor(
    readonly id: number,
    readonly content: string,
    readonly createDate: Date,
    readonly updateDate: Date,
    readonly userInfo: UserInfoModel,
  ) { }
}

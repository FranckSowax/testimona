import { UserInfoMinimalModel } from "src/app/shared/models/user-info-minimal.model";

export class FuneralEventModel {
  constructor(
    readonly id: number,
    readonly memorialId: number,
    readonly title: string,
    readonly date: string,
    readonly startHour: string,
    readonly startHourPeriod: string,
    readonly endHour: string,
    readonly endHourPeriod: string,
    readonly url: string,
    readonly note: string,
    readonly location: string,
    readonly createDate: string,
    readonly updateDate: string,
    readonly userInfo: UserInfoMinimalModel,
  ) { }
}

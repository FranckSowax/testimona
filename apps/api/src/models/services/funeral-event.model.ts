import { HourPeriod } from '@prisma/client';

export class FuneralEventCreateByMemorialIdModel {
  constructor(readonly id: number, readonly createDate: Date) {}
}

class FuneralEventUserModel {
  constructor(readonly userId: string, readonly identity: string) {}
}

export class  FuneralEventModel {
  constructor(
    readonly id: number,
    readonly memorialId: number,
    readonly title: string,
    readonly date: string,
    readonly startHour: string,
    readonly startHourPeriod: HourPeriod,
    readonly endHour: string | null,
    readonly endHourPeriod: HourPeriod,
    readonly url: string,
    readonly note: string,
    readonly location: string,
    readonly createDate: Date | null,
    readonly updateDate: Date | null,
    readonly userInfo: FuneralEventUserModel | null,
  ) {}
}

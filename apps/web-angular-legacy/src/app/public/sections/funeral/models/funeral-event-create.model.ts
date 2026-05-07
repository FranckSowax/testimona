export class FuneralEventCreateModel {
  constructor(
    readonly memorialId: number,
    readonly title: string,
    readonly date: string,
    readonly startHour: string,
    readonly startPeriod: string,
    readonly endHour: string,
    readonly endPeriod: string,
    readonly url: string,
    readonly note: string,
    readonly location: string
  ) { }
}

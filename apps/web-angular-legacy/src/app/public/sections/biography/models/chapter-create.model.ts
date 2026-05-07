export class ChapterCreateModel {
  constructor(
    readonly memorialId: number,
    readonly title: string,
    readonly content: string,
  ) { }
}

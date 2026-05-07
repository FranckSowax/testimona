import { PhotoObjectModel } from "../../photo/models/photo.model";

export class ChapterModel {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly content: string,
    readonly photoArray: Array<PhotoObjectModel> | null
  ) { }
}

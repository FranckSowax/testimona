import { PhotoObjectModel } from "../../photo/models/photo.model";

export class TestimonaGetModel {
  constructor(
    readonly id: number,
    readonly content: string,
    readonly photoArray: Array<PhotoObjectModel> | null
  ) { }
}

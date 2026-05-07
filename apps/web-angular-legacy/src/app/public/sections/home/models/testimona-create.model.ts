import { UserTestimonaModel } from "src/app/core/models/user-testimona.model";

export class TestimonaCreateModel {
  constructor(readonly content: string, readonly relative: string) { }
}

export class TestimonaCreateModalModel {
  constructor(
    readonly content: string,
    readonly userInfo: UserTestimonaModel,
  ){ }
}

export class TestimonaModel {
  constructor(
    readonly id: number,
    readonly content: string,
    readonly createDate: Date,
    readonly updateDate: Date,
    readonly userInfo: UserTestimonaModel,
  ) { }
}

import { UserTestimonaModel } from 'src/app/core/models/user-testimona.model';
import { PhotoObjectModel } from '../../photo/models/photo.model';

export class TestimonaModel {
  constructor(
    readonly id: number,
    readonly content: string,
    readonly createDate: Date,
    readonly updateDate: Date,
    readonly userInfo: UserTestimonaModel,
  ) {}
}

export class TestimonaListModel {
  constructor(
    readonly id: number,
    readonly content: string,
    readonly createDate: Date,
    readonly updateDate: Date,
    readonly userInfo: UserTestimonaModel,
    readonly numberOfLike: number,
    readonly userLiked: boolean,
    readonly photoArray: Array<PhotoObjectModel>
  ) { }
}

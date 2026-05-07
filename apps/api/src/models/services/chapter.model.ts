import { PhotoUrlResponseModel } from '../responses/photo.model';

export class ChapterCreateByMemorialIdModel {
  constructor(readonly id: number, readonly createDate: Date) {}
}

class ChapterUserModel {
  constructor(readonly userId: string, readonly identity: string) {}
}

export class ChapterModel {
  constructor(
    readonly id: number,
    readonly memorialId: number,
    readonly title: string,
    readonly content: string,
    readonly photos: Array<PhotoUrlResponseModel>,
    readonly createDate: Date | null,
    readonly updateDate: Date | null,
    readonly userInfo: ChapterUserModel | null,
  ) {}
}

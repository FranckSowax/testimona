import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { UserInfoMinimalModel } from 'src/app/shared/models/user-info-minimal.model';
import { ChapterCreateModel } from '../models/chapter-create.model';
import { ChapterEditModel } from '../models/chapter-edit.model';
import { ChapterListModel } from '../models/chapter-list.model';
import { ChapterModel } from '../models/chapter.model';
import { PhotoObjectModel } from '../../../sections/photo/models/photo.model';
import { ChapterService } from './chapter.service';

@Injectable({
  providedIn: 'root',
})

export class ChapterDatastoreService {
  private _privateErrorChapterDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorChapterDatastore$ = this._privateErrorChapterDatastore$.asObservable();

  constructor(private chapterService: ChapterService) { }

  async createChapter(
    chapterCreateModel: ChapterCreateModel,
    memorialId: number
  ): Promise<ChapterModel | null> {
    const createResult = await this.chapterService.create(chapterCreateModel, memorialId);

    if (!createResult.result.success) {
      this._privateErrorChapterDatastore$.next(createResult.result.error);
      return Promise.resolve(null);
    }

    return Promise.resolve(
      new ChapterModel(
        createResult.data.id,
        '',
        '',
        null
      ),
    );
  }

  getChapter(chapterId: number): Observable<ChapterModel | null> {
    return new Observable((newOb) => {
      this.chapterService.get(chapterId).then((chapterResult: ApiObjectResponseModel) => {
        if (!chapterResult.result.success) {
          this._privateErrorChapterDatastore$.next(chapterResult.result.error);
          return newOb.next(null);
        }
        if (chapterResult.data == null) {
          return newOb.next(null)
        }
        return newOb.next(
          new ChapterModel(
            chapterResult.data.id,
            chapterResult.data.title,
            chapterResult.data.content,
            chapterResult.data.photos.map((photo: { createdDate: string; objectId: number; photoId: string; urls: {thumbnail: string, full: string, medium: string}; userInfo: string } ) => {
              return new PhotoObjectModel(
                photo.createdDate,
                photo.photoId,
                photo.urls.thumbnail,
                photo.urls.full,
                photo.urls.medium,
              )
            })
          ),
        );
      })
    });
  }

  async editChapter(chapterId: number, chapterItem: ChapterEditModel): Promise<boolean> {
    const editResult = await this.chapterService.update(chapterId, chapterItem);

    if (!editResult.result.success) {
      this._privateErrorChapterDatastore$.next(editResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }

  async deleteChapter(chapterId: number): Promise<boolean> {
    const deleteResult = await this.chapterService.delete(chapterId);

    if (!deleteResult.result.success) {
      this._privateErrorChapterDatastore$.next(deleteResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }

  async getChaptersList(memorialId: number): Promise<ChapterListModel[] | null> {
    return this.chapterService.getList(memorialId).then((chaptersResult: ApiObjectResponseModel) => {
      if (!chaptersResult.result.success) {
        this._privateErrorChapterDatastore$.next(chaptersResult.result.error);
        return Promise.resolve(null);
      }

      const returnArray = new Array<ChapterListModel>();

      chaptersResult.data.forEach((element: { id: number; memorialId: number; title: string, content: string, createDate: string, updateDate: string, photos: Array<any>, userInfo: { userId: string, identity: string }}) => {
        returnArray.push(new ChapterListModel(
          element.id,
          memorialId,
          element.title,
          element.content,
          element.createDate,
          element.updateDate,
          new UserInfoMinimalModel(element.userInfo.userId, element.userInfo.identity),
          element.photos.map((photo: { createdDate: string; objectId: number; photoId: string; urls: { thumbnail: string, medium: string, full: string }; userInfo: string } ) => {
            return new PhotoObjectModel(
              photo.createdDate,
              photo.photoId,
              photo.urls.thumbnail,
              photo.urls.medium,
              photo.urls.full,
            )
          })
        ),)
      })
      return Promise.resolve(returnArray);
    });
  }
}


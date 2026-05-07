import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserTestimonaModel } from 'src/app/core/models/user-testimona.model';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { PhotoObjectModel } from '../../photo/models/photo.model';
import { TestimonaCreateModel } from '../models/testimona-create.model';
import { TestimonaEditModel } from '../models/testimona-edit.model';
import { TestimonaGetModel } from '../models/testimona-get.model';
import { TestimonaListModel, TestimonaModel } from '../models/testimona.model';
import { TestimonaService } from './testimona.service';

@Injectable({
  providedIn: 'root',
})
export class TestimonaDatastoreService {
  private _privateErrorTestimonaDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorTestimonaDatastore$ = this._privateErrorTestimonaDatastore$.asObservable();

  constructor(private testimonaService: TestimonaService) {}

  async createTestimona(
        memorialId: number,
        testimonaModel: TestimonaCreateModel
    ): Promise<TestimonaModel | null> {
    const createResult = await this.testimonaService.create(memorialId, testimonaModel);

    if (!createResult.result.success) {
      this._privateErrorTestimonaDatastore$.next(createResult.result.error);
      return Promise.resolve(null);
    }

    return Promise.resolve(
      new TestimonaModel(
        createResult.data.id,
        testimonaModel.content,
        createResult.data.createDate,
        createResult.data.createDate,
        null
      ),
    );
  }

  async getTestimonaList(memorialId: number, page: number, pgSize: number): Promise<TestimonaListModel[] | null> {
    return this.testimonaService.getList(memorialId, page, pgSize).then((testimonaResult: ApiObjectResponseModel) => {
      if (!testimonaResult.result.success) {
        this._privateErrorTestimonaDatastore$.next(testimonaResult.result.error);
        return Promise.resolve(null);
      }

      const returnArray = new Array<TestimonaModel>();
      testimonaResult.data.forEach((element: { id: number; content: string; createDate: Date; photos: Array<any>, updateDate: Date; userLiked: boolean, numberOfLike: number; userInfo: { userId: string, identity:string, relationship: string }}) => {
        returnArray.push(new TestimonaListModel(
          element.id,
          element.content,
          element.createDate,
          element.updateDate,
          new UserTestimonaModel(element.userInfo.userId, element.userInfo.identity,element.userInfo.relationship),
          element.numberOfLike,
          element.userLiked,
          element.photos.map((photo: { createdDate: string; objectId: number; photoId: string; urls: { full: string, medium: string, thumbnail: string }; userInfo: string }) => {
            return new PhotoObjectModel(
              photo.createdDate,
              photo.photoId,
              photo.urls.thumbnail,
              photo.urls.medium,
              photo.urls.full,
            )
          })
          ),
        )
      })
      return Promise.resolve(returnArray);
    });
  }

  getTestimona(testimonaId: number): Observable<TestimonaGetModel | null> {
    return new Observable((newOb) => {
      this.testimonaService.get(testimonaId).then((testimonaResult: ApiObjectResponseModel) => {
        if (!testimonaResult.result.success) {
          this._privateErrorTestimonaDatastore$.next(testimonaResult.result.error);
          return newOb.next(null);
        }
        if (testimonaResult.data == null) {
          return newOb.next(null)
        }
        return newOb.next(
          new TestimonaGetModel(
            testimonaResult.data.id,
            testimonaResult.data.content,
            testimonaResult.data.photos.map((photo: { createdDate: string; objectId: number; photoId: string; urls: { thumbnail: string, full: string, medium: string }; userInfo: string }) => {
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

  async likeTestimona(testimonaId: number): Promise<boolean> {
    const likeResult = await this.testimonaService.like(testimonaId);

    if (!likeResult.result.success) {
      this._privateErrorTestimonaDatastore$.next(likeResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }

  async unlikeTestimona(testimonaId: number): Promise<boolean> {
    const unlikeResult = await this.testimonaService.unlike(testimonaId);

    if (!unlikeResult.result.success) {
      this._privateErrorTestimonaDatastore$.next(unlikeResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }

  async editTestimona(testimonaId: number, testimonaItem: TestimonaEditModel): Promise<boolean> {
    const editResult = await this.testimonaService.update(testimonaId, testimonaItem);

    if (!editResult.result.success) {
      this._privateErrorTestimonaDatastore$.next(editResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }

  async deleteTestimona(testimonaId: number): Promise<boolean> {
    const deleteResult = await this.testimonaService.delete(testimonaId);

    if (!deleteResult.result.success) {
      this._privateErrorTestimonaDatastore$.next(deleteResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }
}

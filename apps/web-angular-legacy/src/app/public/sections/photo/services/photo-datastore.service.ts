import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { UserInfoModelPhoto } from 'src/app/shared/models/user-info.model';
import { PhotoCreateAnswerModel, PhotoModel, PhotoModelMemorialPicture } from '../models/photo.model';
import { PhotoService } from './photo.service';

@Injectable({
  providedIn: 'root',
})
export class PhotoDatastoreService {
  private _privateErrorPhotoDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorPhotoDatastore$ = this._privateErrorPhotoDatastore$.asObservable();

  constructor(private photoService: PhotoService) { }

  reset(): void {
    this._privateErrorPhotoDatastore$.next(ApiResultResponseEnum.NoError);
  }

  async createPhoto(photoCreateForm: FormData): Promise<PhotoCreateAnswerModel[] | null> {
    const createResult = await this.photoService.create(photoCreateForm);

    if (!createResult.result.success) {
      this._privateErrorPhotoDatastore$.next(createResult.result.error);
      return Promise.resolve(null);
    }

    const returnArray = new Array<PhotoCreateAnswerModel>();
    createResult.data.urls.forEach((element: { url: string }) => {
      returnArray.push(new PhotoCreateAnswerModel(
        element.url,
      ),
      )
    })
    return Promise.resolve(returnArray);
  }

  async getPhotos(memorialId: number, page: number, pgSize: number): Promise<PhotoModel[] | null> {
    return await this.photoService.get(memorialId, page, pgSize).then((photosResult: ApiObjectResponseModel) => {
      if (!photosResult.result.success) {
        this._privateErrorPhotoDatastore$.next(photosResult.result.error);
        return Promise.resolve(null);
      }
      const returnArray = new Array<PhotoModel>();
      photosResult.data.forEach((element: { createdDate: string, photoId: string; userLiked: boolean, numberOfLike: number, urls: { medium: string, full: string }, userInfos: { identity: string, userId: string } }) => {
        returnArray.push(new PhotoModel(
          element.createdDate,
          element.photoId,
          {
            medium: element.urls.medium,
            full: element.urls.full
          },
          element.numberOfLike,
          element.userLiked,
          new UserInfoModelPhoto(element.userInfos.identity, element.userInfos.userId)
          ),
          )
        })
      return Promise.resolve(returnArray);
    });
  }

  async deletePhotos(photoId: string): Promise<PhotoModel[] | null> {
    return await this.photoService.delete(photoId).then((photoResult: ApiObjectResponseModel) => {
      if (!photoResult.result.success) {
        this._privateErrorPhotoDatastore$.next(photoResult.result.error);
        return Promise.resolve(null);
      }
      const returnArray = new Array<PhotoModel>();
      return Promise.resolve(returnArray);
    });
  }

  async updatePhoto(photoUpdateForm: FormData): Promise<boolean> {
    const updateResult = await this.photoService.update(photoUpdateForm);
    if (updateResult.result.success == false) {
      return Promise.resolve(false);
    }
    return Promise.resolve(updateResult.data);
  }

  async getPhotosForMemorialPicture(objectType: string, objectId: number): Promise<PhotoModelMemorialPicture[] | null> {
    return await this.photoService.getPhotos(objectType, objectId).then((photosResult: ApiObjectResponseModel) => {
      if (!photosResult.result.success) {
        this._privateErrorPhotoDatastore$.next(photosResult.result.error);
        return Promise.resolve(null);
      }
      const returnArray = new Array<PhotoModelMemorialPicture>();

      photosResult.data.forEach((element: { createdDate: string, photoId: string; urls: { circle: string, thumbnail: string, medium: string, full: string }, userInfos: { identity: string, userId: string } }) => {
        returnArray.push(new PhotoModelMemorialPicture(
          element.createdDate,
          element.photoId,
          {
            circle: element.urls.circle,
            thumbnail: element.urls.thumbnail,
            medium: element.urls.medium,
            full: element.urls.full
          },
          new UserInfoModelPhoto(element.userInfos.identity, element.userInfos.userId)
        ),
        )
      })
      return Promise.resolve(returnArray);
    });
  }

  async likePhoto(photoId: string): Promise<boolean> {
    const likeResult = await this.photoService.like(photoId);

    if (!likeResult.result.success) {
      this._privateErrorPhotoDatastore$.next(likeResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }

  async unlikePhoto(photoId: string): Promise<boolean> {
    const unlikeResult = await this.photoService.unlike(photoId);

    if (!unlikeResult.result.success) {
      this._privateErrorPhotoDatastore$.next(unlikeResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }
}

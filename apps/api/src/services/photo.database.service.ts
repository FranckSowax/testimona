import { LogTypeError, MediaObjectType, Photo } from '@prisma/client';
import { ErrorServiceModel, UserIdentityModel } from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import { PhotoCloudinaryService } from './photo.cloudinary.service';
import * as _ from 'lodash';
import { CloudinaryUploadPhotoResultModel, DeleteDbPhotoResultModel, PhotoUrlResponseModel } from '../models/responses/photo.model';
import { IncludeDataExistsEnum } from '../enums/_.enums';
import { UserService } from './user.service';
import { UserHelpers } from '../helpers/_.helpers';

const serviceName = 'PhotoDatabaseService';

export class PhotoDatabaseService extends CommonService {
  private static _instance: PhotoDatabaseService;

  static getInstance(): PhotoDatabaseService {
    if (!PhotoDatabaseService._instance) {
      PhotoDatabaseService._instance = new PhotoDatabaseService();
    }
    return PhotoDatabaseService._instance;
  }

  constructor() {
    super();
  }

  async exists(photoId: string, includeData: IncludeDataExistsEnum): Promise<boolean> {
    try {
      let whereCondition: any = { photoId: photoId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
        'isDeleted'
      );

      const count = await this.executeQueries<number>([
        this._prismaDb.photo.count({
          where: whereCondition,
        }),
      ]);

      return Promise.resolve(count[0] == 1);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'exists', {
          photoId,
          includeData,
        }),
        error.message,
      );
      throw error;
    }
  }

  async get(objectType: MediaObjectType, objectId: string, includeData: IncludeDataExistsEnum): Promise<PhotoUrlResponseModel[] | []> {
    try {
      let whereCondition: any = { objectType: objectType, objectId: objectId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
        'isDeleted'
      );

      const photoData = await this.executeQueries<Photo[]>([
        this._prismaDb.photo.findMany({
          where: whereCondition,
          select: {
            photoId: true,
            publicId: true,
            url: true,
            createAt: true,
            createByIdFk: true
          }
        }),
      ]);

      if (photoData == null || photoData.length == 0)
        return Promise.resolve([]);

      const userIds = _.map(photoData[0], (ite) => { return ite.createByIdFk; });
      const userData = await UserService.getInstance().getIdentityDataForUserIds(userIds);

      const returnData = _.map<Photo, PhotoUrlResponseModel>(
        photoData[0],
        (item: Photo) => {
          let userInfos: UserIdentityModel | undefined = undefined;
          if (userData) {
            userInfos = _.find(userData, ((u) => { return u.userId == item.createByIdFk; }));
          }

          return new PhotoUrlResponseModel(
            item.photoId,
            {
              circle: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { gravity: "face", radius: "max", height: 112, width: 120, crop: "thumb", sign_url: true, secure: true, type: "authenticated" }),
              thumbnail: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { height: 200, crop: "fill", sign_url: true, secure: true, type: "authenticated" }),
              medium: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { width: 250, crop: "fill", sign_url: true, secure: true, type: "authenticated" }),
              full: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { sign_url: true, secure: true, type: "authenticated" }),
            },
            objectId,
            item.createAt,
            {
              userId: userInfos?.userId!,
              identity: UserHelpers.getStringNameToDisplay(userInfos),
            }
          );
        },
      );

      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'get', {
          objectType,
          objectId,
          includeData,
        }),
        error.message,
      );
      throw error;
    }
  }

  async getByMemorialId(memorialId: string, includeData: IncludeDataExistsEnum, objectType: MediaObjectType, pageRequest: number, pageSize: number): Promise<PhotoUrlResponseModel[]> {
    try {
      let criteria: any = {};
      let whereCondition: any = { objectId: memorialId, objectType: objectType };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
        'isDeleted'
      );

      criteria['where'] = whereCondition;
      criteria['select'] = { photoId: true, publicId: true, createAt: true, createByIdFk: true };
      // criteria['skip'] = (pageRequest < 0 ? 0 : pageRequest) * pageSize;
      // criteria['take'] = pageSize;
      criteria['orderBy'] = [{ createAt: 'asc' }];

      const photoData = await this.executeQueries<Photo[]>([
        this._prismaDb.photo.findMany(criteria),
      ]);

      if (photoData == null || photoData.length == 0)
        return Promise.resolve([]);

      const userIds = _.map(photoData[0], (ite) => { return ite.createByIdFk; });
      const userData = await UserService.getInstance().getIdentityDataForUserIds(userIds);

      const returnData = _.map<Photo, PhotoUrlResponseModel>(
        photoData[0],
        (item: Photo) => {
          let userInfos: UserIdentityModel | undefined = undefined;
          if (userData) {
            userInfos = _.find(userData, ((u) => { return u.userId == item.createByIdFk; }));
          }

          return new PhotoUrlResponseModel(
            item.photoId,
            {
              circle: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { gravity: "face", radius: "max", height: 112, width: 120, crop: "thumb", sign_url: true, secure: true, type: "authenticated" }),
              thumbnail: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { height: 200, crop: "fill", sign_url: true, secure: true, type: "authenticated" }),
              medium: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { width: 250, crop: "fill", sign_url: true, secure: true, type: "authenticated" }),
              full: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { sign_url: true, secure: true, type: "authenticated" }),
            },
            memorialId.toString(),
            item.createAt,
            {
              userId: userInfos?.userId!,
              identity: UserHelpers.getStringNameToDisplay(userInfos),
            }
          );
        },
      );

      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getByMemorialId', {
          memorialId,
          includeData,
          objectType,
          pageRequest,
          pageSize
        }),
        error.message,
      );
      throw error;
    }
  }

  async add(currentUserId: string, objectId: string, objectType: MediaObjectType, photoData: CloudinaryUploadPhotoResultModel): Promise<boolean> {
    try {
      const photoCreated = await this.executeQueries<Photo>([
        this._prismaDb.photo.create({
          data: {
            photoId: photoData.assetId,
            objectId: objectId,
            objectType: objectType,
            publicId: photoData.publicId,
            path: photoData.path,
            version: photoData.version,
            format: photoData.format,
            size: photoData.size,
            type: photoData.type,
            url: photoData.url,
            accessMode: photoData.accessMode,
            createByIdFk: currentUserId,
            updateByIdFk: currentUserId,
            isDeleted: false,
          },
        }),
      ]);

      return Promise.resolve(photoData.assetId == photoCreated[0].photoId );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'add', {
          currentUserId,
          objectId,
          objectType,
          photoData
        }),
        error.message,
      );
      throw error;
    }
  }

  async update(currentUserId: string, photoData: CloudinaryUploadPhotoResultModel): Promise<boolean> {
    try {
      const photoCreated = await this.executeQueries<Photo>([
        this._prismaDb.photo.update({
          where: {
            photoId: photoData.assetId
          },
          data: {
            publicId: photoData.publicId,
            path: photoData.path,
            version: photoData.version,
            format: photoData.format,
            size: photoData.size,
            type: photoData.type,
            url: photoData.url,
            accessMode: photoData.accessMode,
            updateByIdFk: currentUserId,
            updateAt: new Date(),
          },
        }),
      ]);

      return Promise.resolve(photoData.assetId == photoCreated[0].photoId );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'update', {
          currentUserId,
          photoData
        }),
        error.message,
      );
      throw error;
    }
  }

  async delete(currentUserId: string, assetId: string): Promise<DeleteDbPhotoResultModel | null> {
    try {
      const photoDelete = await this.executeQueries<Photo>([
        this._prismaDb.photo.update({
          where: {
            photoId: assetId
          },
          data: {
            isDeleted: true,
            updateByIdFk: currentUserId,
            updateAt: new Date(),
          },
          select: {
            publicId: true,
            path: true,
          }
        }),
      ]);

      if (photoDelete == null || photoDelete == undefined || photoDelete.length == 0) {
        return Promise.resolve(null);
      }

      return Promise.resolve(
        new DeleteDbPhotoResultModel(
          assetId,
          photoDelete[0].publicId,
          photoDelete[0].path
        )
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'delete', {
          currentUserId,
          assetId
        }),
        error.message,
      );
      throw error;
    }
  }

  async getPhotoDataForObjectIds(
    objectType: MediaObjectType,
    objectIds: string[],
  ): Promise<PhotoUrlResponseModel[] | undefined> {
    try {
      const photosFound = new Array<PhotoUrlResponseModel>();

      const photoData = await this.executeQueries<Photo[]>([
        this._prismaDb.photo.findMany({
          where: {
            AND: {
              objectId: {
                in: objectIds,
              },
              objectType: objectType,
              isDeleted: false
            },
          },
          select: {
            photoId: true, 
            publicId: true,
            objectId: true,
            createAt: true,
          },
        }),
      ]);

      if (!photoData || photoData[0].length == 0) {
        return Promise.resolve(undefined);
      }

      const returnData = _.map<Photo, PhotoUrlResponseModel>(
        photoData[0],
        (item: Photo) => {
          return new PhotoUrlResponseModel(
            item.photoId,
            {
              circle: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { gravity: "face", radius: "max", height: 112, width: 120, crop: "thumb", sign_url: true, secure: true, type: "authenticated" }),
              thumbnail: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { height: 200, crop: "fill", sign_url: true, secure: true, type: "authenticated" }),
              medium: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { width: 250, crop: "fill", sign_url: true, secure: true, type: "authenticated" }),
              full: PhotoCloudinaryService.getInstance().getFullUrl(item.publicId, { sign_url: true, secure: true, type: "authenticated" }),
            },
            item.objectId,
            item.createAt,
            null
          );
        },
      );

      // return value
      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getPhotoDataForObjectIds', {
          objectType,
          objectIds,
        }),
        error.message,
      );
      throw error;
    }
  }

  async like(photoId: string): Promise<boolean> {
    try {
      const photoUpdated = await this.executeQueries<Photo>([
        this._prismaDb.photo.update({
          where: {
            photoId: photoId,
          },
          data: {
            numberOfLike: { increment: 1 }
          },
        }),
      ]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'like', { photoId: photoId }),
        error.message,
      );
      throw error;
    }
  }

  async unlike(photoId: string): Promise<boolean> {
    try {
      const photoUpdated = await this.executeQueries<Photo>([
        this._prismaDb.photo.update({
          where: {
            photoId: photoId,
          },
          data: {
            numberOfLike: { decrement: 1 }
          },
        }),
      ]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'unlike', { photoId: photoId }),
        error.message,
      );
      throw error;
    }
  }
}

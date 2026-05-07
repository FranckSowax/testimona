import express from 'express';
import { PhotoCloudinaryService } from '../services/photo.cloudinary.service';
import _ from 'lodash';
import { DeletePhotoRequestModel, UpdatePhotoRequestModel, UploadPhotoRequestModel } from '../models/requests/photos.model';
import { CloudinaryUploadPhotoResultModel, DeleteDbPhotoResultModel, DeletePhotoResponseModel } from '../models/responses/photo.model';
import { BooleanResponseModel, ErrorResponseModel, ErrorServiceModel, ObjectResponseModel } from '../models/_.models';
import { ErrorCommonResponseEnum, ErrorMemorialResponseEnum, ErrorPhotoRequestResponseEnum, ErrorPhotoResponseEnum, IncludeDataExistsEnum } from '../enums/_.enums';
import { PhotoDatabaseService } from '../services/photo.database.service';
import { MemorialService } from '../services/memorial.service';
import { LogTypeError, MediaObjectType } from '@prisma/client';
import { LogService } from '../services/commons/log.service';
import { UserLikedItemService } from '../services/user-liked-item.service';

export class PhotoController {
  //#region Cloudinary
  async uploadToCloudinary(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const uploadData = req.body.data as UploadPhotoRequestModel;
      const uploadResults = new Array<CloudinaryUploadPhotoResultModel>();

      for (let ite of uploadData.files) {
        let uploadResult = await PhotoCloudinaryService.getInstance().upload(req.body.userId, uploadData.objectId, uploadData.objectType, ite);
        if (uploadResult) {
          uploadResults.push(uploadResult);
        }
      };

      delete req.body.data.previousFilesData;
      delete req.body.data.files;
      req.body.data.uploadFiles = uploadResults;

      return next();
    } catch (error: any) {
      console.log('catch: upload photo failed');
      return res
        .status(500)
        .send({ error: 'create upload photo failed' });
    }
  }

  async moveFromCloudinary(req: express.Request, res: express.Response) {
    try {
      const deleteData = req.body.data.deleteData as Array<DeleteDbPhotoResultModel>;
      const deleteResults = new Array<DeletePhotoResponseModel>();

      for (let ite of deleteData) {
        // For now, we just move the file in a backup directory
        let destroyResult = await PhotoCloudinaryService.getInstance().move(ite.publicId, ite.path);
        if (destroyResult) {
          // update tags in Cloudinary (add 'deleted')
          deleteResults.push({ photoId: ite.assetId, isDeleted: destroyResult });
        }
      };

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError
          },
          deleteResults
        )
      );
    } catch (error: any) {
      console.log('catch: move photo failed');
      return res
        .status(500)
        .send({ error: 'move photo failed' });
    }
  }
  //#endregion

  //#region Database
  async getByMemorialId(req: express.Request, res: express.Response) {
    try {
      // find if the memorial existes
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId,
      );
      if (!memorialExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.MemorialNotExist,
            },
            null,
          ),
        );
      }

      const photoUrls = await PhotoDatabaseService.getInstance().getByMemorialId(
        req.params.memorialId, IncludeDataExistsEnum.ActiveData,
        MediaObjectType.Photo, +req.query.page!, +req.query.pgSize!);
      
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          photoUrls,
        ),
      );
    } catch (error: any) {
      console.log('catch: get photos by memorialId failed');
      return res
        .status(500)
        .send({ error: 'get photos by memorialId failed' });
    }
  }

  async get(req: express.Request, res: express.Response) {
    try {
      const objectType = Object.keys(MediaObjectType).find((type) => type.toLowerCase() == req.params.objectType.toLowerCase());
      const photoUrls = await PhotoDatabaseService.getInstance().get(objectType as MediaObjectType, req.params.objectId, IncludeDataExistsEnum.ActiveData);
      
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: photoUrls.length > 0,
            error: photoUrls.length > 0 ? ErrorCommonResponseEnum.NoError : ErrorPhotoRequestResponseEnum.PhotoNotExist,
          },
          photoUrls,
        ),
      );
    } catch (error: any) {
      console.log('catch: get photos by memorialId failed');
      return res
        .status(500)
        .send({ error: 'get photos by memorialId failed' });
    }
  }

  async createOrUpdateToDb(req: express.Request, res: express.Response) {
    // This to be able to remove the asset in Cloudinary
    let currentPublicId = '';

    try {
      const uploadData = req.body.data as UploadPhotoRequestModel;
      const uploadResults = req.body.data.uploadFiles as Array<CloudinaryUploadPhotoResultModel>;
      
      for (let ite of uploadResults) {
        currentPublicId = ite.publicId;

        const photoExists = await PhotoDatabaseService.getInstance().exists(ite.assetId, IncludeDataExistsEnum.ActiveData);
        const actionResult = (!photoExists) 
                            ? await PhotoDatabaseService.getInstance().add(req.body.userId, uploadData.objectId.toString(), uploadData.objectType, ite)
                            : await PhotoDatabaseService.getInstance().update(req.body.userId, ite);

        if (!actionResult) {
          await PhotoCloudinaryService.getInstance().delete(ite.publicId);
        }
      }

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError
          },
          {
            urls: _.map(uploadResults, 'url')
          },
        ),
      );
    } catch (error: any) {
      console.log('catch: create photo db failed');
      await PhotoCloudinaryService.getInstance().delete(currentPublicId);
      return res
        .status(500)
        .send({ error: 'create photo db failed' });
    }
  }

  async deleteFromDb(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const deleteData = req.body.data as DeletePhotoRequestModel;
      const deleteResults = new Array<DeleteDbPhotoResultModel>();

      for (let assetId of deleteData.photoIds) {
        let deleteResult = await PhotoDatabaseService.getInstance().delete(req.body.userId, assetId);
        if (deleteResult) {
          deleteResults.push(deleteResult);
        }
      };

      req.body.data.deleteData = deleteResults;

      return next();
    } catch (error: any) {
      console.log('catch: delete photo db failed');
      return res
        .status(500)
        .send({ error: 'delete photo db failed' });
    }
  }

  async updatePhotosForObject(req: express.Request, res: express.Response) {
    try {
        const updateData = req.body.data as UpdatePhotoRequestModel;

        // Delete previous photos
        if (updateData.photosToDeleteIds != undefined) {
            for (let assetId of updateData.photosToDeleteIds.split(',')) {
                let deleteResult = await PhotoDatabaseService.getInstance().delete(req.body.userId, assetId);
                console.log('deleteResult:', deleteResult)
                if (deleteResult) {
                    let destroyResult = await PhotoCloudinaryService.getInstance().move(deleteResult.publicId, deleteResult.path);
                    if (destroyResult == false) {
                      LogService.getInstance().create(
                        LogTypeError.Warn,
                        new ErrorServiceModel('PhotoController', 'updatePhotosForObject:PhotoCloudinaryService:move', {
                          deleteResult,
                          userId: req.body.userId
                        }),
                        'error delete photo in Db');
                    }
                } else {
                  LogService.getInstance().create(
                    LogTypeError.Warn,
                    new ErrorServiceModel('PhotoController', 'updatePhotosForObject:PhotoDatabaseService:delete', {
                      assetId,
                      userId: req.body.userId
                    }),
                    'error delete photo in Db');
                }
            }
        }

        // Add photos
        if (updateData.files != undefined) {
            for (let ite of updateData.files) {
                let uploadResult = await PhotoCloudinaryService.getInstance().upload(req.body.userId, updateData.objectId, updateData.objectType, ite);
                if (uploadResult == null) {
                    LogService.getInstance().create(
                        LogTypeError.Warn,
                        new ErrorServiceModel('PhotoController', 'updatePhotosForObject:PhotoCloudinaryService:upload', {
                          objectId: updateData.objectId,
                          objectType: updateData.objectType,
                          userId: req.body.userId,
                          ite: ite
                        }),
                        'error add photo in Cloudinary');
                } else {
                    const photoExists = await PhotoDatabaseService.getInstance().exists(uploadResult.assetId, IncludeDataExistsEnum.ActiveData);
                    const actionResult = (!photoExists) 
                                        ? await PhotoDatabaseService.getInstance().add(req.body.userId, updateData.objectId.toString(), updateData.objectType, uploadResult)
                                        : await PhotoDatabaseService.getInstance().update(req.body.userId, uploadResult);
            
                    if (!actionResult) {
                        await PhotoCloudinaryService.getInstance().delete(uploadResult.publicId);
                        LogService.getInstance().create(
                            LogTypeError.Warn,
                            new ErrorServiceModel('PhotoController', 'updatePhotosForObject:PhotoCloudinaryService:upload', {
                              objectId: updateData.objectId,
                              objectType: updateData.objectType,
                              userId: req.body.userId,
                              ite: ite
                            }),
                            'error add photo in Cloudinary');
                    }
                }
            }
          }

        return res.status(200).send(new BooleanResponseModel(
            {
                success: true,
                error: ErrorCommonResponseEnum.NoError,
            },
                true
            )
        );
    } catch (error: any) {
        console.log('catch: update photo and cloudinary failed', error);
        return res.status(500).send({ error: 'update photo and cloudinary failed' });
    }
  }

  async like(req: express.Request, res: express.Response) {
    try {
      // find if the photo exists
      const photoExists = await PhotoDatabaseService.getInstance().exists(
        req.params.objectId,
        IncludeDataExistsEnum.ActiveData,
      );
      if (!photoExists) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorPhotoRequestResponseEnum.PhotoNotExist,
            },
            false,
          ),
        );
      }

      // update photo
      const photoIsUpdated = await PhotoDatabaseService.getInstance().like(req.params.objectId);
      if (photoIsUpdated == null) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorPhotoResponseEnum.LikePhotoFailed,
            },
            false,
          ),
        );
      }

      // add link between current user and item liked
      const userLikedItem = await UserLikedItemService.getInstance().like(req.body.userId, req.params.objectId, MediaObjectType.Photo);
      if (userLikedItem == false) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorPhotoResponseEnum.UserLikedPhotoFailed,
            },
            false,
          ),
        );
      }

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          photoIsUpdated,
        ),
      );
    } catch (error: any) {
      console.log('catch: like photo failed');
      return res
        .status(500)
        .send({ error: 'like photo failed' });
    }
  }

  async unlike(req: express.Request, res: express.Response) {
    try {
      // find if the photo exists
      const photoExists = await PhotoDatabaseService.getInstance().exists(
        req.params.objectId,
        IncludeDataExistsEnum.ActiveData,
      );
      if (!photoExists) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorPhotoRequestResponseEnum.PhotoNotExist,
            },
            false,
          ),
        );
      }

      // update photo
      const photoIsUpdated = await PhotoDatabaseService.getInstance().unlike(req.params.objectId);
      if (photoIsUpdated == null) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorPhotoResponseEnum.LikePhotoFailed,
            },
            false,
          ),
        );
      }

      // remove link between current user and item liked
      const userLikedItem = await UserLikedItemService.getInstance().unlike(req.body.userId, req.params.objectId, MediaObjectType.Photo);
      if (userLikedItem == false) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorPhotoResponseEnum.UserLikedPhotoFailed,
            },
            false,
          ),
        );
      }

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          photoIsUpdated,
        ),
      );
    } catch (error: any) {
      console.log('catch: unlike photo failed');
      return res
        .status(500)
        .send({ error: 'unlike photo failed' });
    }
  }
  //#endregion
}

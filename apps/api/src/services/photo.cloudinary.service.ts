import { LogTypeError, MediaObjectType } from '@prisma/client';
import { ConfigAndUrlOptions, TransformationOptions, v2 as cloudinaryV2} from 'cloudinary';
import { ErrorServiceModel } from '../models/_.models';
import { LogService } from './commons/log.service';
import * as _ from 'lodash';
import { UploadFileDataModel } from '../models/common/common.model';
import { CloudinaryUploadPhotoResultModel } from '../models/responses/photo.model';
import { PhotoHelpers } from '../helpers/_.helpers';
import * as Constantes from '../helpers/constantes/_.constantes';

const serviceName = 'PhotoCloudinaryService';

export class PhotoCloudinaryService {
  private static _instance: PhotoCloudinaryService;
  private _fs = require('fs-extra');

  static getInstance(): PhotoCloudinaryService {
    if (!PhotoCloudinaryService._instance) {
      PhotoCloudinaryService._instance = new PhotoCloudinaryService();
    }
    return PhotoCloudinaryService._instance;
  }

  constructor() {
    cloudinaryV2.config({
      secure: true
    });
  }

  async upload(userId: string, objectId: number, objectType: MediaObjectType, uploadFileData: UploadFileDataModel): Promise<CloudinaryUploadPhotoResultModel | null> {
    try {
      const { directory, tags } = PhotoHelpers.getUploadingSettings(objectId, objectType);
      const uploadResult = await cloudinaryV2.uploader.upload(uploadFileData.path, {
        folder: directory,
        access_mode: 'authenticated',
        allowed_formats: ['jpg', 'png'],
        type: 'authenticated',
        backup: true,
        resource_type: "image",
        tags: [...tags, userId],
        public_id: uploadFileData.previousName != '' ? uploadFileData.previousName : '',
      }, (err, result) => {
        return Promise.resolve({ result, err })
      });

      // delete tmp file
      this._fs.unlinkSync(uploadFileData.path);

      if (uploadResult == null || uploadResult == undefined || uploadResult.asset_id == '') {
        return Promise.resolve(null);
      }

      return Promise.resolve({
        assetId: uploadResult.asset_id,
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        path: directory,
        accessMode: uploadResult.access_mode,
        createdAt: new Date(uploadResult.created_at),
        format: uploadResult.format,
        size: uploadResult.bytes,
        type: uploadResult.type,
        version: uploadResult.version
      });
    } catch (error: any) {
      // delete tmp file
      this._fs.unlinkSync(uploadFileData.path);

      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'upload', { userId, objectId, objectType, uploadFileData }),
        error.message,
      );
      throw error;
    }
  }

  async move(publicId: string, cloudinaryPath: string): Promise<boolean> {
    try {
      const filename = publicId.replace(cloudinaryPath + '/', '');
      const deleteDirectory = `${cloudinaryPath}/${Constantes.CloudinaryNameDeletedDirectory}/${filename}`;
      const renameResult = await cloudinaryV2.uploader.rename(publicId, deleteDirectory, {
        invalidate: true,
        type: 'authenticated',
        resource_type: "image",
      }, (err, result) => {
        return Promise.resolve({ result, err })
      });

      if (renameResult == null || renameResult == undefined) {
        return Promise.resolve(false);
      }

      return Promise.resolve(renameResult.public_id == deleteDirectory);

    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'move', { publicId, cloudinaryPath }),
        error.message,
      );
      throw error;
    }
  }

  async delete(publicId: string): Promise<boolean> {
    try {
      const destroyResult = await cloudinaryV2.uploader.destroy(publicId, (err, result) => {
        return Promise.resolve({ result, err })
      });

      console.log(destroyResult)

      return Promise.resolve(destroyResult.result == 'ok');
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'delete', { publicId }),
        error.message,
      );
      throw error;
    }
  }

  getFullUrl(publicId: string, options?: TransformationOptions | ConfigAndUrlOptions | undefined): string {
    return cloudinaryV2.url(publicId, options);
  }
}

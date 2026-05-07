import { MediaObjectType } from '@prisma/client';
import express from 'express';
import Joi from 'joi';
import { ErrorCommonResponseEnum } from '../enums/_.enums';
import { UploadFileDataModel, UploadFilePreviousData } from '../models/common/common.model';
import { DeletePhotoRequestModel, UpdatePhotoRequestModel, UploadPhotoRequestModel } from '../models/requests/photos.model';
import { ErrorResponseModel } from '../models/_.models';
import { JoiMiddlewares } from './common/joi.middleware';

export class PhotoMiddleware {
  async validateUploadPhotoRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        body: Joi.object<UploadPhotoRequestModel>({
          objectId: Joi.number().required(),
          objectType: Joi.string().valid(...Object.keys(MediaObjectType)).required(),
          previousFilesData: !req.files ? Joi.string().optional() : +req.files.length < 2 ? Joi.string().required() : Joi.array().length(+req.files?.length!).required()
        }),
        files: Joi.array()
          .min(1)
          .max(2)
          .required()
          .items(Joi.object<UploadFileDataModel>({
            path: Joi.string().required(),
            mimetype: Joi.string().required(),
            originalname: Joi.string().required(),
        }))
      });

      var { error, value } = schema.validate(
        req,
        JoiMiddlewares.getJoiFormatMessages(),
      );

      if (error) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorCommonResponseEnum.InvalidBodyData,
            },
            JoiMiddlewares.getJoiFormatErrors(error.details),
          ),
        );
      }

      req.body.data = {};
      req.body.data.objectId = (value.body as UploadPhotoRequestModel).objectId;
      req.body.data.objectType = (value.body as UploadPhotoRequestModel).objectType;
      req.body.data.files = (value as UploadPhotoRequestModel).files;

      if (req.body.data.files.length == 1) {
        (req.body.data.files[0] as UploadFileDataModel).previousName = (JSON.parse(req.body.previousFilesData) as UploadFilePreviousData).previousName;
      } else {
        for (let index = 0; index < req.body.data.files.length; index++) {
          (req.body.data.files[index] as UploadFileDataModel).previousName = (JSON.parse(req.body.previousFilesData[index]) as UploadFilePreviousData).previousName;
        }
      }
      
      return next();
    } catch (err) {
      console.log('req.body: ', req.body);
      console.log('req.files: ', req.files);

      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }

  async validateDeletePhotoRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    try {
      const schema = Joi.object<DeletePhotoRequestModel>({
        photoIds: Joi.array().min(1).required()
          .items(Joi.string().required())
      });

      var { error, value } = schema.validate(
        req.body,
        JoiMiddlewares.getJoiFormatMessages(),
      );

      if (error) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorCommonResponseEnum.InvalidBodyData,
            },
            JoiMiddlewares.getJoiFormatErrors(error.details),
          ),
        );
      }

      req.body.data = (value as DeletePhotoRequestModel);
      return next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }

  async validateUpdatePhotoRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const schema = Joi.object({
        body: Joi.object<UpdatePhotoRequestModel>({
          objectId: Joi.number().required(),
          objectType: Joi.string().valid(...Object.keys(MediaObjectType)).required(),
          photosToDeleteIds: !req.body.photosToDeleteIds ? Joi.string().optional() : Joi.string().required()
        }),
        files: !req.files || req.files.length == 0 ? Joi.array().optional() : Joi.array()
          .min(1)
          .max(2)
          .required()
          .items(Joi.object<UploadFileDataModel>({
            path: Joi.string().required(),
            mimetype: Joi.string().required(),
            originalname: Joi.string().required(),
        }))
      });

      var { error, value } = schema.validate(
        req,
        JoiMiddlewares.getJoiFormatMessages(),
      );

      if (error) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorCommonResponseEnum.InvalidBodyData,
            },
            JoiMiddlewares.getJoiFormatErrors(error.details),
          ),
        );
      }

      req.body.data = {};
      req.body.data.objectId = (value.body as UpdatePhotoRequestModel).objectId;
      req.body.data.objectType = (value.body as UpdatePhotoRequestModel).objectType;
      req.body.data.photosToDeleteIds = (value.body as UpdatePhotoRequestModel).photosToDeleteIds;
      req.body.data.files = (value as UpdatePhotoRequestModel).files;
      
      return next();
    } catch (err) {
      console.log('req.body: ', req.body);
      console.log('req.files: ', req.files);

      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }

  async validatePhotoTypeParameter(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const objectType = req.params.objectType;

      if (!objectType || objectType == '') {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorCommonResponseEnum.MissingParameter,
            },
            null,
          ),
        );
      }

      if (Object.keys(MediaObjectType).map((type) => type.toLowerCase()).indexOf(objectType.toLowerCase()) < 0) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorCommonResponseEnum.InvalidParameter,
            },
            null,
          ),
        );
      }
      
      return next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }
}

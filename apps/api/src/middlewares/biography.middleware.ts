import express from 'express';
import Joi from 'joi';
import { ErrorCommonResponseEnum } from '../enums/_.enums';
import { ErrorResponseModel } from '../models/_.models';
import { JoiMiddlewares } from './common/joi.middleware';

export class BiographyMiddleware {
  async validateCreateBiographyRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        nicknames: Joi.string().max(5000).optional(),
        homeCity: Joi.string().max(5000).optional(),
        placesLived: Joi.string().max(5000).optional(),
        // relatives: Joi.array().optional(), // TODO: array of numeric only
        religion: Joi.string().max(5000).optional(),
        education: Joi.string().max(5000).optional(),
        work: Joi.string().max(5000).optional(),
        hobbies: Joi.string().max(5000).optional(),
      });

      const { error, value } = schema.validate(
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

      req.body.data = value;
      return next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }

  async validateUpdateBiographyRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        nicknames: Joi.string().max(5000).optional(),
        homeCity: Joi.string().max(5000).optional(),
        placesLived: Joi.string().max(5000).optional(),
        // relatives: Joi.array().optional(), // TODO: array of numeric only
        religion: Joi.string().max(5000).optional(),
        education: Joi.string().max(5000).optional(),
        work: Joi.string().max(5000).optional(),
        hobbies: Joi.string().max(5000).optional(),
      });

      const { error, value } = schema.validate(
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

      req.body.data = value;
      return next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }
}

import { Relative } from '@prisma/client';
import express from 'express';
import Joi from 'joi';
import { ErrorCommonResponseEnum } from '../enums/_.enums';
import { ErrorResponseModel } from '../models/_.models';
import { JoiMiddlewares } from './common/joi.middleware';

export class MemorialRequestMiddleware {
  async validateCreateRequestAdminMemorialRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        memorialId: Joi.number().required(),
        relative: Joi.custom((value) => {
          if (Object.values(Relative).includes(value)) return value;

          throw 'error in relative value';
        }).required(),
        note: Joi.string().max(500).required(),
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

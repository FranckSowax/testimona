import { HourPeriod } from '@prisma/client';
import express from 'express';
import Joi from 'joi';
import { ErrorCommonResponseEnum } from '../enums/_.enums';
import { ErrorResponseModel } from '../models/_.models';
import { JoiMiddlewares } from './common/joi.middleware';
import { NumberHelpers } from '../helpers/_.helpers';

export class FuneralEventMiddleware {
  async validateCreateFuneralEventRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        title: Joi.string().max(500).required(),
        date: Joi.string().max(10).required(),
        startHour: Joi.string().regex(/^(0?[1-9]|1[0-2]):([0-5]\d)$/).required(),
        startPeriod: Joi.custom((value) => {
          if (Object.values(HourPeriod).includes(value)) return value;

          return HourPeriod.Null;
        }).optional(),
        endHour: Joi.string().allow('').optional(),
        endPeriod: Joi.custom((value) => {
          if (Object.values(HourPeriod).includes(value)) return value;

          return HourPeriod.Null;
        }).optional(),
        url: Joi.string().allow('').max(500).optional(),
        note: Joi.string().allow('').max(5000).optional(),
        location: Joi.string().allow('').max(5000).optional(),
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

  async validateFuneralEventIdParameter(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const funeralEventId = req.params.funeralEventId;

      if (!funeralEventId || funeralEventId == '') {
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

      if (!NumberHelpers.isNumber(funeralEventId)) {
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

  async validateUpdateFuneralEventRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        title: Joi.string().max(500).required(),
        // date: Joi.extend(JoiDate).date().format('YYYY/MM/DD').required(),
        date: Joi.string().max(10).required(),
        startHour: Joi.string().regex(/^(0?[1-9]|1[0-2]):([0-5]\d)$/).required(),
        startPeriod: Joi.custom((value) => {
          if (Object.values(HourPeriod).includes(value)) return value;

          return HourPeriod.Null;
        }).optional(),
        endHour: Joi.string().allow('').optional(),
        endPeriod: Joi.custom((value) => {
          if (Object.values(HourPeriod).includes(value)) return value;

          return HourPeriod.Null;
        }).optional(),
        url: Joi.string().allow('').max(500).optional(),
        note: Joi.string().allow('').max(5000).optional(),
        location: Joi.string().allow('').max(5000).optional(),
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

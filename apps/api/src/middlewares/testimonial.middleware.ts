import { Relative } from '@prisma/client';
import express from 'express';
import Joi from 'joi';
import { ErrorCommonResponseEnum } from '../enums/_.enums';
import { NumberHelpers } from '../helpers/_.helpers';
import { ErrorResponseModel } from '../models/_.models';
import { JoiMiddlewares } from './common/joi.middleware';

export class TestimonialMiddleware {
  async validateCreateTestimonialRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        content: Joi.string().allow(''),
        relative: Joi.custom((value) => {
          if (Object.values(Relative).includes(value)) return value;

          return Relative.DoNotWishToDisclose;
        }).required(),
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

  async validateTestimonialIdParameter(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const testimonialId = req.params.testimonialId;

      if (!testimonialId || testimonialId == '') {
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

      if (!NumberHelpers.isNumber(testimonialId)) {
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

  async validateUpdateTestimonialRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        content: Joi.string().max(500).required(),
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

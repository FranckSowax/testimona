import express from 'express';
import Joi from 'joi';
import { ErrorCommonResponseEnum } from '../enums/_.enums';
import { ErrorResponseModel } from '../models/_.models';
import { JoiMiddlewares } from './common/joi.middleware';

export class DonationMiddleware {
  async validateUpdateDonationGoal(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        amount: Joi.number().min(1).required(),
        message: Joi.string().optional()
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

  async validateStartProcess(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        anonymous: Joi.boolean().required()
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

  async validateUpdateDonationRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const checkoutId = req.params.checkoutId;

      if (!checkoutId || checkoutId == '') {
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
      
      return next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }
}

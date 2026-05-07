import express from 'express';
import { ErrorCommonResponseEnum } from '../../enums/_.enums';
import { ErrorResponseModel } from '../../models/_.models';

export class ConfigurationMiddleware {
  async validateGetLanguage(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const language = req.params.language;

      if (!language || language == '') {
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

      if (language.length != 2) {
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

import express from 'express';
import _ from 'lodash';
import { ErrorCommonResponseEnum } from '../../enums/_.enums';
import { NumberHelpers } from '../../helpers/_.helpers';
import { ErrorResponseModel } from '../../models/_.models';

export class CommonMiddlewares {
  async validateUrlParameterNumberObjectId(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const objectId = req.params.objectId;

      if (!objectId || objectId == '') {
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

      if (!NumberHelpers.isNumber(objectId)) {
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

  async validateUrlParameterStringObjectId(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const objectId = req.params.objectId;

      if (!objectId || objectId == '') {
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

  async validateUrlPaginationQuery(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const pgSize = req.query.pgSize as string;
      const page = req.query.page as string;

      if (!pgSize || pgSize == '' || !page || page == '') {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorCommonResponseEnum.MissingQueryParameter,
            },
            null,
          ),
        );
      }

      if (!NumberHelpers.isNumber(pgSize) || !NumberHelpers.isNumber(page)) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorCommonResponseEnum.InvalidQueryParameter,
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

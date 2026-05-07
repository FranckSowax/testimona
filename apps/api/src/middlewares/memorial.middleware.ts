import { Relative } from '@prisma/client';
import express from 'express';
import Joi from 'joi';
import { ErrorCommonResponseEnum } from '../enums/_.enums';
import { NumberHelpers } from '../helpers/_.helpers';
import { ErrorResponseModel } from '../models/_.models';
import { JoiMiddlewares } from './common/joi.middleware';

export class MemorialMiddleware {
  async validateCreateMemorialRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        firstname: Joi.string().max(100).required(),
        lastname: Joi.string().max(100).required(),
        yearOfDeath: Joi.number().min(1500).max(2300).required(),
        monthOfDeath: Joi.number().min(0).max(12).optional(),
        dayOfDeath: Joi.number().min(0).max(31).optional(),
        countryOfDeath: Joi.number().required(),
        cityOfDeath: Joi.string().allow('').optional(),
        shortBiography: Joi.string().allow('').max(150).optional(),
        relative: Joi.custom((value) => {
          if (Object.values(Relative).includes(value)) return value;

          return Relative.DoNotWishToDisclose;
        }).required(),
        isAdmin: Joi.boolean().required(),
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

  async validateCreateTestimonialRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        content: Joi.string().max(500).required(),
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

  async validateSearchByUrlParameter(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let errorIsFound = false;
      const joiErrors = new Array<Joi.ValidationErrorItem>();

      const searchValue = req.params.searchValue;
      if (!searchValue || searchValue == '') {
        errorIsFound = true;
        joiErrors.push({
          type: 'string.empty',
          context: { key: 'searchValue' },
          message: '',
          path: [],
        });
      } else if (searchValue.length < 3) {
        errorIsFound = true;
        joiErrors.push({
          type: 'number.max',
          context: { key: 'searchValue', limit: 3, value: searchValue.length },
          message: '',
          path: [],
        });
      }

      const maxResult = req.params.maxResult;
      if (!maxResult || maxResult == '' || !NumberHelpers.isNumber(maxResult)) {
        errorIsFound = true;
        joiErrors.push({
          type: 'number.base',
          context: { key: 'maxResult' },
          message: '',
          path: [],
        });
      } else if (+maxResult < 5) {
        errorIsFound = true;
        joiErrors.push({
          type: 'number.min',
          context: { key: 'maxResult', limit: 5, value: +maxResult },
          message: '',
          path: [],
        });
      } else if (+maxResult > 15) {
        errorIsFound = true;
        joiErrors.push({
          type: 'number.max',
          context: { key: 'maxResult', limit: 15, value: +maxResult },
          message: '',
          path: [],
        });
      }

      if (errorIsFound) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorCommonResponseEnum.InvalidParameter,
            },
            JoiMiddlewares.getJoiFormatErrors(joiErrors),
          ),
        );
      }

      return next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }

  async validateSearchParameter(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let errorIsFound = false;
      const joiErrors = new Array<Joi.ValidationErrorItem>();

      const searchQueries = new Array<string>('firstname', 'lastname', 'year', 'country');
      let numberOfQueryParam = 0;
      searchQueries.forEach((param) => {
        const searchValue = req.query[param];
        if (searchValue != undefined) {
          numberOfQueryParam++;
          if (searchValue == '') {
            errorIsFound = true;
            joiErrors.push({
              type: 'string.empty',
              context: { key: param },
              message: '',
              path: [],
            });
          }
        }
      });

      if (numberOfQueryParam == 0) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorCommonResponseEnum.MissingQueryParameter,
            },
            JoiMiddlewares.getJoiFormatErrors(joiErrors),
          ),
        );
      }

      const maxResult = req.params.maxResult;
      if (!maxResult || maxResult == '' || !NumberHelpers.isNumber(maxResult)) {
        errorIsFound = true;
        joiErrors.push({
          type: 'number.base',
          context: { key: 'maxResult' },
          message: '',
          path: [],
        });
      } else if (+maxResult < 5) {
        errorIsFound = true;
        joiErrors.push({
          type: 'number.min',
          context: { key: 'maxResult', limit: 5, value: +maxResult },
          message: '',
          path: [],
        });
      } else if (+maxResult > 15) {
        errorIsFound = true;
        joiErrors.push({
          type: 'number.max',
          context: { key: 'maxResult', limit: 15, value: +maxResult },
          message: '',
          path: [],
        });
      }

      if (errorIsFound) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorCommonResponseEnum.InvalidParameter,
            },
            JoiMiddlewares.getJoiFormatErrors(joiErrors),
          ),
        );
      }

      return next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }

    async validateMemorialIdParameter(
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) {
      try {
        const memorialId = req.params.memorialId;

        if (!memorialId || memorialId == '') {
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

        if (!NumberHelpers.isNumber(memorialId)) {
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

  async validateMemorialUrlParameter(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const memorialUrl = req.params.memorialUrl;

      if (!memorialUrl || memorialUrl == '') {
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

  async validateUpdateMemorialRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    let validationResult: Joi.ValidationResult;

    try {
      const schema = Joi.object({
        firstname: Joi.string().max(100).required(),
        lastname: Joi.string().max(100).required(),
        yearOfBirth: Joi.number().min(1500).max(2300).allow(0).optional(),
        monthOfBirth: Joi.number().min(0).max(12).optional(),
        dayOfBirth: Joi.number().min(0).max(31).optional(),
        countryOfBirth: Joi.number().optional(),
        cityOfBirth: Joi.string().allow('').optional(),
        yearOfDeath: Joi.number().min(1500).max(2300).required(),
        monthOfDeath: Joi.number().min(0).max(12).optional(),
        dayOfDeath: Joi.number().min(0).max(31).optional(),
        countryOfDeath: Joi.number().required(),
        cityOfDeath: Joi.string().allow('').optional(),
        shortBiography: Joi.string().allow('').max(150).optional(),
      });

      validationResult = schema.validate(
        req.body,
        JoiMiddlewares.getJoiFormatMessages(),
      );

      if (validationResult.error) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorCommonResponseEnum.InvalidBodyData,
            },
            JoiMiddlewares.getJoiFormatErrors(validationResult.error.details),
          ),
        );
      }

      req.body.data = validationResult.value;
      return next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }

  async validateAdminIdAndRequestIdParameter(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const adminId = req.params.adminId;
      if (!adminId || adminId == '') {
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

      const requestId = req.params.requestId;
      if (!requestId || requestId == '') {
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

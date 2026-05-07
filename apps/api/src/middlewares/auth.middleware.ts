import {
  AuthenticationMode,
  DisplayName,
  UserRole,
} from '@prisma/client';
import express from 'express';
import Joi from 'joi';
import { ErrorCommonResponseEnum } from '../enums/_.enums';
import { ErrorResponseModel } from '../models/_.models';
import { JoiMiddlewares } from './common/joi.middleware';

export class AuthMiddleware {
  async validateEmailExistsBodyRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const schema = Joi.object({
        email: Joi.string().lowercase().email().max(100).required(),
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

  async validateRegisterBodyRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let validationResult: {
          error: Joi.ValidationError;
          warning?: Joi.ValidationError;
          value: any;
      };
      let schemaToValidate: any;

      schemaToValidate = Joi.object({
        loginType: Joi.required().custom((value) => {
          if (Object.values(AuthenticationMode).includes(value)) return value;

          return undefined;
        }),
      });

      validationResult = schemaToValidate.validate(
        req.body,
        JoiMiddlewares.getJoiFormatMessages(),
      );

      if (
        !validationResult.error &&
        validationResult.value.hasOwnProperty('loginType')
      ) {
        let loginTypeFound = true;
        switch (validationResult.value.loginType) {
          case AuthenticationMode.Site:
            schemaToValidate = Joi.object({
              nickname: Joi.string().required().max(50),
              firstname: Joi.string().allow('').max(50).optional(),
              lastname: Joi.string().allow('').max(50).optional(),
              displayName: Joi.custom((value) => {
                if (Object.values(DisplayName).includes(value)) return value;

                return DisplayName.Nickname;
              }).required(),
              email: Joi.string().lowercase().email().max(100).required(),
              password: Joi.string().min(8).required(),
              language: Joi.string().required(),
              role: Joi.custom((value) => {
                if (Object.values(UserRole).includes(value)) return value;

                return UserRole.User;
              }).optional(),
              loginType: Joi.required().custom((value) => {
                return AuthenticationMode.Site;
              }),
              answers: Joi.array()
                .length(2)
                .required()
                .items(
                  Joi.object({
                    id: Joi.number().required(),
                    answer: Joi.string().required(),
                  }),
                ),
            });
            break;
          default:
            loginTypeFound = false;
            validationResult.error = new Joi.ValidationError(
              '"loginType" contains an invalid value',
              [
                {
                  message: '"loginType" contains an invalid value',
                  path: ['loginType'],
                  type: 'any.invalid',
                  context: { label: 'loginType', key: 'loginType' },
                },
              ],
              [],
            );
            break;
        }

        if (loginTypeFound) {
          validationResult = schemaToValidate.validate(
            req.body,
            JoiMiddlewares.getJoiFormatMessages(),
          );
        }
      } else {
        validationResult.error = new Joi.ValidationError(
          '"loginType" contains an invalid value',
          [
            {
              message: '"loginType" contains an invalid value',
              path: ['loginType'],
              type: 'any.invalid',
              context: { label: 'loginType', key: 'loginType' },
            },
          ],
          [],
        );
      }

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

  async validateUserIdParameter(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const userId = req.params.userId;

      if (!userId || userId == '') {
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

  async validateLoginBodyRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let validationResult: {
        error: Joi.ValidationError;
        warning?: Joi.ValidationError;
        value: any;
      };
      let schemaToValidate: any;

      schemaToValidate = Joi.object({
        loginType: Joi.required().custom((value) => {
          if (Object.values(AuthenticationMode).includes(value)) return value;

          return undefined;
        }),
      });

      validationResult = schemaToValidate.validate(
        req.body,
        JoiMiddlewares.getJoiFormatMessages(),
      );

      if (
        !validationResult.error &&
        validationResult.value.hasOwnProperty('loginType')
      ) {
        let loginTypeFound = true;
        switch (validationResult.value.loginType) {
          case AuthenticationMode.Site:
            schemaToValidate = Joi.object({
              email: Joi.string().lowercase().email().max(100).required(),
              password: Joi.string().min(8).required(),
              loginType: Joi.required().custom((value) => {
                if (Object.values(AuthenticationMode).includes(value))
                  return value;

                return AuthenticationMode.Site;
              }),
            });
            break;
          default:
            loginTypeFound = false;
            validationResult.error = new Joi.ValidationError(
              '"loginType" contains an invalid value',
              [
                {
                  message: '"loginType" contains an invalid value',
                  path: ['loginType'],
                  type: 'any.invalid',
                  context: { label: 'loginType', key: 'loginType' },
                },
              ],
              [],
            );
            break;
        }

        if (loginTypeFound) {
          validationResult = schemaToValidate.validate(
            req.body,
            JoiMiddlewares.getJoiFormatMessages(),
          );
        }
      } else {
        validationResult.error = new Joi.ValidationError(
          '"loginType" contains an invalid value',
          [
            {
              message: '"loginType" contains an invalid value',
              path: ['loginType'],
              type: 'any.invalid',
              context: { label: 'loginType', key: 'loginType' },
            },
          ],
          [],
        );
      }

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

  async validateSocialMediaBodyRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let validationResult: {
        error: Joi.ValidationError;
        warning?: Joi.ValidationError;
        value: any;
      };
      let schemaToValidate: any;

      schemaToValidate = Joi.object({
        loginType: Joi.required().custom((value) => {
          if (Object.values(AuthenticationMode).includes(value)) return value;

          return undefined;
        }),
      });

      validationResult = schemaToValidate.validate(
        req.body,
        JoiMiddlewares.getJoiFormatMessages(),
      );

      if (
        !validationResult.error &&
        validationResult.value.hasOwnProperty('loginType')
      ) {
        let loginTypeFound = true;
        switch (validationResult.value.loginType) {
          case AuthenticationMode.Facebook:
            schemaToValidate = Joi.object({
              access_token: Joi.string().required(),
              language: Joi.string().required(),
              loginType: Joi.string().required(),
            });
            break;
          case AuthenticationMode.Google:
            schemaToValidate = Joi.object({
              id_token: Joi.string().required(),
              id: Joi.string().required(),
              loginType: Joi.string().required(),
            });
            break;
          default:
            loginTypeFound = false;
            validationResult.error = new Joi.ValidationError(
              '"loginType" contains an invalid value',
              [
                {
                  message: '"loginType" contains an invalid value',
                  path: ['loginType'],
                  type: 'any.invalid',
                  context: { label: 'loginType', key: 'loginType' },
                },
              ],
              [],
            );
            break;
        }

        if (loginTypeFound) {
          validationResult = schemaToValidate.validate(
            req.body,
            JoiMiddlewares.getJoiFormatMessages(),
          );
        }
      } else {
        validationResult.error = new Joi.ValidationError(
          '"loginType" contains an invalid value',
          [
            {
              message: '"loginType" contains an invalid value',
              path: ['loginType'],
              type: 'any.invalid',
              context: { label: 'loginType', key: 'loginType' },
            },
          ],
          [],
        );
      }

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
}

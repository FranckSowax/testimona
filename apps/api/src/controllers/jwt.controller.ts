import express from 'express';
import { AuthService } from '../services/auth.service';
import { JwtService } from '../services/commons/jwt.service';
import * as Constantes from '../helpers/constantes/_.constantes';
import {
  BooleanResponseModel,
  ErrorResponseModel,
  ObjectResponseModel,
} from '../models/_.models';
import {
  ErrorAuthResponseEnum,
  ErrorCommonResponseEnum,
} from '../enums/_.enums';

export class JwtController {
  async createRegisterJwtToken(req: express.Request, res: express.Response) {
    try {
      const {
        registerToken,
      } = await JwtService.getInstance().createRegisterJwtToken();

      if (!registerToken || registerToken == '') {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorAuthResponseEnum.CreateRegisterTokenFailed,
            },
            null,
          ),
        );
      }

      // Set browser httpOnly cookies
      await JwtService.getInstance().setCookies(
        res,
        Constantes.RegisterToken,
        registerToken,
      );

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          true,
        ),
      );
    } catch (err) {
      console.log('catch: create token failed');
      return res.status(500).send({ error: 'create token failed' });
    }
  }

  async createJwtToken(req: express.Request, res: express.Response) {
    try {
      const {
        accessToken,
        refreshToken,
      } = await JwtService.getInstance().createJwtToken(req.body.userId, req.body.data.role);

      if (
        !accessToken ||
        accessToken == '' ||
        !refreshToken ||
        refreshToken == ''
      ) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorAuthResponseEnum.CreateTokenFailed,
            },
            null,
          ),
        );
      }

      // Set browser httpOnly cookies
      await JwtService.getInstance().setCookies(
        res,
        Constantes.AccessToken,
        accessToken,
      );
      await JwtService.getInstance().setCookies(
        res,
        Constantes.RefreshToken,
        refreshToken,
      );

      await JwtService.getInstance().clearCookie(res, Constantes.RegisterToken);

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          {
            userId: req.body.userId,
            firstname: req.body.data.firstname,
            lastname: req.body.data.lastname,
            nickname: req.body.data.nickname,
            displayName: req.body.data.displayName,
            role: req.body.data.role,
            language: req.body.data.language,
          },
        ),
      );
    } catch (err) {
      console.log('catch: create token failed');
      // Delete user when Jwt Token failed otherwise the user won't be able to create an account (email should be unique)
      await AuthService.getInstance().cancelUserRegistration(req.body.userId);
      return res.status(500).send({ user: '', error: 'create token failed' });
    }
  }

  async deleteRegisterJwtToken(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      await JwtService.getInstance().deleteRedisRegisterJwtToken();

      // clear browser cookies
      JwtService.getInstance().clearCookie(res, Constantes.RegisterToken);

      next();
    } catch (err) {
      console.log('catch: delete Register Jwt failed');
      return res
        .status(500)
        .send({ logout: false, error: 'delete Register Jwt failed' });
    }
  }

  async deleteJwtToken(req: express.Request, res: express.Response) {
    try {
      const userExists = await JwtService.getInstance().existsRedisJwtToken(
        req.body.userId,
      );
      if (!userExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorAuthResponseEnum.LogoutFailed,
            },
            {
              error: "token not found"
            },
          ),
        );
      }
      await JwtService.getInstance().deleteRedisRefreshJwtToken(
        req.body.userId,
      );

      // clear browser cookies
      JwtService.getInstance().clearCookie(res, Constantes.AccessToken);
      JwtService.getInstance().clearCookie(res, Constantes.RefreshToken);
      JwtService.getInstance().clearCookie(res, Constantes.RegisterToken);

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          true,
        ),
      );
    } catch (err) {
      console.log('catch: delete Jwt failed');
      return res
        .status(500)
        .send({ logout: false, error: 'delete Jwt failed' });
    }
  }
}

import express from 'express';
import { LogTypeError, UserRole } from '@prisma/client';
import cryptoJs from 'crypto-js';
import jsonwebtoken from 'jsonwebtoken';
import * as Constantes from '../../helpers/constantes/_.constantes';
import { ErrorServiceModel } from '../../models/_.models';
import { LogService } from './log.service';
import logger from './logger.service';
import { RedisService } from './redis.service';
import * as _ from 'lodash';
import { StringHelpers } from '../../helpers/_.helpers';

const serviceName = 'JwtService';

export class JwtService {
  private static _instance: JwtService;

  static getInstance(): JwtService {
    if (!JwtService._instance) {
      JwtService._instance = new JwtService();
    }
    return JwtService._instance;
  }

  constructor() {}

  async createRegisterJwtToken(): Promise<any> {
    try {
      let registerToken = jsonwebtoken.sign({ uuid: 'register' }, Constantes.TokenKey, {
        expiresIn: '10m',
        issuer: 'testimona-api',
        audience: 'testimona-web',
      });

      await RedisService.getInstance().setData(
        [Constantes.PrefixTokenKey, Constantes.RegisterToken],
        registerToken,
      );
      await RedisService.getInstance().addExpiration(
        [Constantes.PrefixTokenKey, Constantes.RegisterToken],
        600,
      );

      return { registerToken: registerToken };
    } catch (error: any) {
      logger.error('JwtService error', { message: error.message, stack: error.stack });
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'createRegisterJwtToken', {
          register: 'register',
        }),
        error.message,
      );
      throw error;
    }
  }

  async createJwtToken(userId: string, userRole: UserRole): Promise<any> {
    try {
      let refreshId = StringHelpers.replaceAll(userId, '-', '') + userRole + Constantes.TokenKey;
      let salt = cryptoJs.lib.WordArray.random(16);
      let hash = cryptoJs.HmacSHA512(refreshId, salt);
      let refresh_token = cryptoJs.enc.Base64.stringify(hash);

      let access_token = jsonwebtoken.sign({ uuid: userId, role: userRole }, Constantes.TokenKey, {
        expiresIn: Constantes.TokenExpired,
        issuer: 'testimona-api',
        audience: 'testimona-web',
      });

      await RedisService.getInstance().setData(
        [Constantes.PrefixTokenKey, userId, Constantes.RefreshToken],
        refresh_token,
      );
      await RedisService.getInstance().addExpiration(
        [Constantes.PrefixTokenKey, userId, Constantes.RefreshToken],
        Constantes.TokenRefreshExpired,
      );

      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (error: any) {
      logger.error('JwtService error', { message: error.message, stack: error.stack });
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'createJwtToken', { userId, userRole }),
        error.message,
      );
      throw error;
    }
  }

  async existsRedisJwtToken(userId: string): Promise<boolean> {
    try {
      return await RedisService.getInstance().keyExists([
        Constantes.PrefixTokenKey,
        userId,
        Constantes.RefreshToken,
      ]);
    } catch (error: any) {
      logger.error('JwtService error', { message: error.message, stack: error.stack });
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'existsRedisJwtToken', { userId }),
        error.message,
      );
      throw error;
    }
  }

  async deleteRedisRegisterJwtToken(): Promise<any> {
    try {
      await RedisService.getInstance().deleteData([
        Constantes.PrefixTokenKey,
        Constantes.RegisterToken,
      ]);
    } catch (error: any) {
      logger.error('JwtService error', { message: error.message, stack: error.stack });
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'deleteRegisterJwtToken', {
          token: 'register token deleted',
        }),
        error.message,
      );
      throw error;
    }
  }

  async deleteRedisRefreshJwtToken(userId: string): Promise<any> {
    try {
      await RedisService.getInstance().deleteData([
        Constantes.PrefixTokenKey,
        userId,
        Constantes.RefreshToken,
      ]);
    } catch (error: any) {
      logger.error('JwtService error', { message: error.message, stack: error.stack });
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'deleteRedisRefreshJwtToken', { userId }),
        error.message,
      );
      throw error;
    }
  }

  async verifyJwtToken(accessToken: string): Promise<any> {
    try {
      const userIdValue = jsonwebtoken.decode(accessToken);
      return jsonwebtoken.verify(
        accessToken,
        Constantes.TokenKey,
        { issuer: 'testimona-api', audience: 'testimona-web' },
        (err, decoded: any) => {
          return {
            err,
            userData: decoded ? decoded : userIdValue
          };
        },
      );
    } catch (error: any) {
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'verifyJwtToken', {}),
        error.message,
      );
      throw error;
    }
  }

  async getRedisRefreshJwtTokens(userId: string): Promise<any> {
    try {
      return await RedisService.getInstance().getData([
        Constantes.PrefixTokenKey,
        userId,
        Constantes.RefreshToken,
      ]);
    } catch (error: any) {
      logger.error('JwtService error', { message: error.message, stack: error.stack });
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getRedisTokens', { userId }),
        error.message,
      );
      throw error;
    }
  }

  async setCookies(res: express.Response, key: string, token: string) {
    const isSecure = Constantes.SecureCookie.toLowerCase() === 'true' || Constantes.SecureCookie === '1';
    res.cookie(key, token, {
      secure: isSecure,
      httpOnly: true,
      sameSite: isSecure ? 'strict' : 'lax',
      path: '/',
      maxAge: Constantes.TokenRefreshExpired * 1000,
    });
  }

  async clearCookie(res: express.Response, key: string) {
    res.clearCookie(key, { path: '/' });
  }
}

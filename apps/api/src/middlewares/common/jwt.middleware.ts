import express from 'express';
import { JwtVerifyErrors } from '../../models/_.models';
import { JwtService } from '../../services/commons/jwt.service';
import * as Constantes from '../../helpers/constantes/_.constantes';
import { UserRole } from '@prisma/client';

export class JwtMiddleware {
  async validateRegisterJwt(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let registerToken = req.cookies[Constantes.RegisterToken] || null;

      if (!registerToken) return res.sendStatus(401);

      // They are, so let's verify the access token
      const { err, register } = await JwtService.getInstance().verifyJwtToken(
        registerToken,
      );

      // Error found during the verification of the token
      if (err) {
        // The error is different then TokenExpiredError
        if ((err as JwtVerifyErrors).name != 'TokenExpiredError')
          return res.sendStatus(401);

        // regenerate access token and refresh token
        const {
          registerToken,
        } = await JwtService.getInstance().createRegisterJwtToken();

        // Set browser httpOnly cookies
        await JwtService.getInstance().setCookies(
          res,
          Constantes.RegisterToken,
          registerToken,
        );
      }

      next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }

  async validateJwt(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let actualAccessToken = req.cookies[Constantes.AccessToken] || null;
      let actualRefreshToken = req.cookies[Constantes.RefreshToken] || null;

      if (!actualAccessToken || !actualRefreshToken) return res.status(401).send();

      // They are, so let's verify the access token
      const { err, userData } = await JwtService.getInstance().verifyJwtToken(
        actualAccessToken,
      );

      // Error found during the verification of the token
      if (err) {
        // The error is different then TokenExpiredError
        if ((err as JwtVerifyErrors).name != 'TokenExpiredError')
          return res.sendStatus(401);

        // Get the refresh token from Redis
        const refreshAccessTokenStored = await JwtService.getInstance().getRedisRefreshJwtTokens(
          userData.uuid,
        );

        if (
          !refreshAccessTokenStored ||
          refreshAccessTokenStored != actualRefreshToken
        )
          return res.sendStatus(401);

        // regenerate access token and refresh token
        const {
          accessToken,
          refreshToken,
        } = await JwtService.getInstance().createJwtToken(userData.uuid, userData.role);

        // Clear browser cookies
        await JwtService.getInstance().clearCookie(res, Constantes.AccessToken);
        await JwtService.getInstance().clearCookie(res, Constantes.RefreshToken);

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
      }

      if (err && !userData) return res.sendStatus(401);

      req.body.userId = userData.uuid;
      next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }

  async validateJwtAdmin(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let actualAccessToken = req.cookies[Constantes.AccessToken] || null;
      let actualRefreshToken = req.cookies[Constantes.RefreshToken] || null;

      if (!actualAccessToken || !actualRefreshToken) return res.status(401).send();

      // They are, so let's verify the access token
      const { err, userData } = await JwtService.getInstance().verifyJwtToken(
        actualAccessToken,
      );

      // Error found during the verification of the token
      if (err) {
        // The error is different then TokenExpiredError
        if ((err as JwtVerifyErrors).name != 'TokenExpiredError')
          return res.sendStatus(401);

        // Get the refresh token from Redis
        const refreshAccessTokenStored = await JwtService.getInstance().getRedisRefreshJwtTokens(
          userData.uuid,
        );

        if (
          !refreshAccessTokenStored ||
          refreshAccessTokenStored != actualRefreshToken
        )
          return res.sendStatus(401);

        // regenerate access token and refresh token
        const {
          accessToken,
          refreshToken,
        } = await JwtService.getInstance().createJwtToken(userData.uuid, userData.role);

        // Clear browser cookies
        await JwtService.getInstance().clearCookie(res, Constantes.AccessToken);
        await JwtService.getInstance().clearCookie(res, Constantes.RefreshToken);

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
      }

      if (err && !userData) return res.sendStatus(401);

      if (userData.role != UserRole.Admin) return res.sendStatus(403);

      req.body.userId = userData.uuid;
      next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }

  async optionalJwt(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let actualAccessToken = req.cookies[Constantes.AccessToken] || null;
      let actualRefreshToken = req.cookies[Constantes.RefreshToken] || null;

      if (!actualAccessToken || !actualRefreshToken) {
        req.body.userId = '';
        return next();
      }

      // They are, so let's verify the access token
      const { err, userData } = await JwtService.getInstance().verifyJwtToken(
        actualAccessToken,
      );

      // Error found during the verification of the token
      if (err) {
        // The error is different then TokenExpiredError
        if ((err as JwtVerifyErrors).name != 'TokenExpiredError') {
          req.body.userId = '';
          return next();
        }

        // Get the refresh token from Redis
        const refreshAccessTokenStored = await JwtService.getInstance().getRedisRefreshJwtTokens(
          userData.uuid,
        );

        if (
          !refreshAccessTokenStored ||
          refreshAccessTokenStored != actualRefreshToken
        ) {
          req.body.userId = '';
          return next();
        }

        // regenerate access token and refresh token
        const {
          accessToken,
          refreshToken,
        } = await JwtService.getInstance().createJwtToken(userData.uuid, userData.role);

        // Clear browser cookies
        await JwtService.getInstance().clearCookie(res, Constantes.AccessToken);
        await JwtService.getInstance().clearCookie(res, Constantes.RefreshToken);

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
      }

      req.body.userId = userData.uuid;
      next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }

  async validateLogoutJwt(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let accessToken = req.cookies[Constantes.AccessToken] || null;
      let refreshToken = req.cookies[Constantes.RefreshToken] || null;

      if (!accessToken && !refreshToken) return res.sendStatus(200);

      // They are, so let's verify the access token
      const { err, userData } = await JwtService.getInstance().verifyJwtToken(
        accessToken,
      );

      req.body.userId = userData.uuid;

      // Error found during the verification of the token
      if (err) {
        // The error is different then TokenExpiredError
        if ((err as JwtVerifyErrors).name != 'TokenExpiredError')
          return res.sendStatus(200);
      }

      next();
    } catch (err) {
      console.log('err', err);
      return res.status(500).send({ error: err });
    }
  }
}

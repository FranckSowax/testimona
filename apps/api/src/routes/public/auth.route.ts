import express from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { JwtController } from '../../controllers/jwt.controller';
import { AuthMiddleware } from '../../middlewares/auth.middleware';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { CommonRoutesConfig } from '../commons/common.route';

export class AuthRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'AuthRoutes');
  }

  configurationRoutes(): express.Application {
    const authMiddleware = new AuthMiddleware();
    const jwtMiddleware = new JwtMiddleware();
    const authController = new AuthController();
    const jwtController = new JwtController();

    this.app.get('/register', [
      jwtController.createRegisterJwtToken,
    ]);

    this.app.post('/register/emailexists', [
      jwtMiddleware.validateRegisterJwt,
      authMiddleware.validateEmailExistsBodyRequest,
      authController.emailexists,
    ]);

    this.app.post('/register', [
      jwtMiddleware.validateRegisterJwt,
      authMiddleware.validateRegisterBodyRequest,
      authController.register,
      authController.sendEmailToActivateAccount,
      jwtController.deleteRegisterJwtToken,
      jwtController.createJwtToken,
    ]);

    this.app.post('/auth', [ // only via email/pwd
      authMiddleware.validateLoginBodyRequest,
      authController.login,
      jwtController.createJwtToken
    ]);

    this.app.post('/auth/relogin', [ // re-login the user with accessToken
      jwtMiddleware.validateJwt,
      authController.relogin,
      jwtController.createJwtToken
    ]);

    this.app.post('/auth/social', [ // only par FB or Google
      authMiddleware.validateSocialMediaBodyRequest,
      authController.loginSocialMedia,
      // emailController.loginSocialMedia,
      jwtController.createJwtToken
    ]);


    this.app.post('/signout', [
      jwtMiddleware.validateLogoutJwt,
      jwtController.deleteJwtToken,
    ]);

    return this.app;
  }
}

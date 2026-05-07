import express from 'express';
import { ConfigurationController } from '../../controllers/configuration.controller';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { CommonRoutesConfig } from './common.route';

export class ConfigurationRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'ConfigurationRoutes');
  }

  configurationRoutes(): express.Application {
    const jwtMiddleware = new JwtMiddleware();
    const configurationController = new ConfigurationController();

    this.app.get('/config', [
      jwtMiddleware.optionalJwt,
      configurationController.configuration
    ]);

    this.app.get('/config/memorial', [
      // jwtMiddleware.validateJwt,
      jwtMiddleware.optionalJwt,
      configurationController.memorial
    ]);

    return this.app;
  }
}
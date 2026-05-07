import express from 'express';
import { BiographyMiddleware } from '../../middlewares/biography.middleware';
import { MemorialMiddleware } from '../../middlewares/memorial.middleware';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { CommonRoutesConfig } from '../commons/common.route';
import { BiographyController } from '../../controllers/biography.controller';

export class BiographyRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'BiographyRoutes');
  }

  configurationRoutes(): express.Application {
    const jwtMiddleware = new JwtMiddleware();
    const biographyMiddleware = new BiographyMiddleware();
    const memorialMiddleware = new MemorialMiddleware();
    const biographyController = new BiographyController();

    this.app.get('/biography/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      biographyController.getByMemorialId
    ]);

    this.app.all('/biography', jwtMiddleware.validateJwt);
    this.app.all('/biography/*', jwtMiddleware.validateJwt);

    this.app.post('/biography/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      biographyMiddleware.validateCreateBiographyRequest,
      biographyController.createWithMemorialId
    ]);

    this.app.put('/biography/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      biographyMiddleware.validateUpdateBiographyRequest,
      biographyController.update
    ]);

    return this.app;
  }
}

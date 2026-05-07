import express from 'express';
import { FuneralMiddleware } from '../../middlewares/funeral.middleware';
import { MemorialMiddleware } from '../../middlewares/memorial.middleware';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { CommonRoutesConfig } from '../commons/common.route';
import { FuneralController } from '../../controllers/funeral.controller';

export class FuneralRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'FuneralRoutes');
  }

  configurationRoutes(): express.Application {
    const jwtMiddleware = new JwtMiddleware();
    const funeralMiddleware = new FuneralMiddleware();
    const memorialMiddleware = new MemorialMiddleware();
    const funeralController = new FuneralController();

    this.app.get('/funeral/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      funeralController.getByMemorialId
    ]);

    this.app.all('/funeral', jwtMiddleware.validateJwt);
    this.app.all('/funeral/*', jwtMiddleware.validateJwt);

    this.app.post('/funeral/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      funeralMiddleware.validateCreateFuneralRequest,
      funeralController.createWithMemorialId
    ]);

    this.app.put('/funeral/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      funeralMiddleware.validateUpdateFuneralRequest,
      funeralController.update
    ]);

    return this.app;
  }
}

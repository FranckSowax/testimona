import express from 'express';
import { FuneralEventMiddleware } from '../../middlewares/funeral-event.middleware';
import { MemorialMiddleware } from '../../middlewares/memorial.middleware';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { CommonRoutesConfig } from '../commons/common.route';
import { FuneralEventController } from '../../controllers/funeral-event.controller';

export class FuneralEventRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'FuneralEventRoutes');
  }

  configurationRoutes(): express.Application {
    const jwtMiddleware = new JwtMiddleware();
    const funeralEventMiddleware = new FuneralEventMiddleware();
    const memorialMiddleware = new MemorialMiddleware();
    const funeralEventController = new FuneralEventController();

    this.app.get('/funeralevent/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      funeralEventController.getByMemorialId
    ]);

    this.app.all('/funeralevent', jwtMiddleware.validateJwt);
    this.app.all('/funeralevent/*', jwtMiddleware.validateJwt);

    this.app.post('/funeralevent/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      funeralEventMiddleware.validateCreateFuneralEventRequest,
      funeralEventController.createWithMemorialId
    ]);

    this.app.get('/funeralevent/:funeralEventId/detail', [
      funeralEventMiddleware.validateFuneralEventIdParameter,
      funeralEventController.get
    ]);

    this.app.put('/funeralevent/:funeralEventId', [
      funeralEventMiddleware.validateFuneralEventIdParameter,
      funeralEventMiddleware.validateUpdateFuneralEventRequest,
      funeralEventController.update
    ]);

    this.app.delete('/funeralevent/:funeralEventId', [
      funeralEventMiddleware.validateFuneralEventIdParameter,
      funeralEventController.delete
    ]);

    return this.app;
  }
}

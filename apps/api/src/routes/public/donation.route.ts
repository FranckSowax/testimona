import express from 'express';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { DonationMiddleware } from '../../middlewares/donation.middleware';
import { MemorialMiddleware } from '../../middlewares/memorial.middleware';
import { CommonRoutesConfig } from '../commons/common.route';
import { DonationController } from '../../controllers/donation.controller';
import { CommonMiddlewares } from '../../middlewares/common/common.middleware';

export class DonationRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'DonationRoutes');
  }

  configurationRoutes(): express.Application {
    const jwtMiddleware = new JwtMiddleware();
    const donationMiddleware = new DonationMiddleware();
    const commonMiddlewares = new CommonMiddlewares();
    const memorialMiddleware = new MemorialMiddleware();
    const donationController = new DonationController();

    this.app.get('/donation/:memorialId/goal', [
        jwtMiddleware.optionalJwt,
        memorialMiddleware.validateMemorialIdParameter,
        donationController.getDonationGoal
    ]);

    this.app.get('/donation/:memorialId/list', [
        jwtMiddleware.optionalJwt,
        memorialMiddleware.validateMemorialIdParameter,
        // commonMiddlewares.validateUrlPaginationQuery,
        donationController.listByMemorialId
    ]);

    this.app.get('/donation/:checkoutId', [
      donationMiddleware.validateUpdateDonationRequest,
      donationController.updateWithCheckout
    ]);

    this.app.all('/donation', jwtMiddleware.validateJwt);
    this.app.all('/donation/*', jwtMiddleware.validateJwt);

    this.app.post('/donation/:memorialId/goal', [
      memorialMiddleware.validateMemorialIdParameter,
      donationMiddleware.validateUpdateDonationGoal,
      donationController.updateDonationGoal
    ]);

    this.app.post('/donation/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      donationMiddleware.validateStartProcess,
      donationController.createWithMemorialId
    ]);

    return this.app;
  }
}

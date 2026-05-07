import express from 'express';
import { CommonRoutesConfig } from '../commons/common.route';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { CommonMiddlewares } from '../../middlewares/common/common.middleware';
import { MemorialMiddleware } from '../../middlewares/memorial.middleware';
import { DonationController } from '../../controllers/donation.controller';

export class AdminDonationRoutes extends CommonRoutesConfig {
    constructor(app: express.Application) {
      super(app, 'AdminDonationRoutes');
    }
  
    configurationRoutes(): express.Application {
        const jwtMiddleware = new JwtMiddleware();
        const commonMiddlewares = new CommonMiddlewares();
        const memorialMiddleware = new MemorialMiddleware();
        const donationController = new DonationController();

        this.app.all('/admin/donations', jwtMiddleware.validateJwtAdmin);
        this.app.all('/admin/donations/*', jwtMiddleware.validateJwtAdmin);

        this.app.get('/admin/donations/:memorialId/goal', [
          jwtMiddleware.optionalJwt,
          memorialMiddleware.validateMemorialIdParameter,
          donationController.adminGetDonationGoal
        ]);

        this.app.get('/admin/donations/:memorialId', [
            memorialMiddleware.validateMemorialIdParameter,
            commonMiddlewares.validateUrlPaginationQuery,
            donationController.adminListByMemorialId
        ]);
        
        return this.app;
    }
  }
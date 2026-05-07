import express from 'express';
import { CommonRoutesConfig } from '../commons/common.route';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { MemorialController } from '../../controllers/memorial.controller';
import { MemorialMiddleware } from '../../middlewares/memorial.middleware';
import { MemorialUserRelationshipController } from '../../controllers/memorial-user-relationship.controller';
import { CommonMiddlewares } from '../../middlewares/common/common.middleware';

export class AdminMemorialRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'AdminMemorialRoutes');
  }

  configurationRoutes(): express.Application {
    const jwtMiddleware = new JwtMiddleware();
    const commonMiddlewares = new CommonMiddlewares();
    const memorialMiddleware = new MemorialMiddleware();
    const memorialController = new MemorialController();
    const memorialUserRelationshipController = new MemorialUserRelationshipController();

    this.app.all('/admin/memorials', jwtMiddleware.validateJwtAdmin);
    this.app.all('/admin/memorials/*', jwtMiddleware.validateJwtAdmin);

    this.app.get('/admin/memorials', [
      commonMiddlewares.validateUrlPaginationQuery,
      memorialController.getAll
    ]);

    this.app.get('/admin/memorials/:memorialId/admins', [
      memorialMiddleware.validateMemorialIdParameter,
      memorialUserRelationshipController.getAdminUsersByMemorialId
    ]);

    return this.app;
  }
}

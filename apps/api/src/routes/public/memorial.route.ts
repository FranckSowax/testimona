import express from 'express';
import { MemorialMiddleware } from '../../middlewares/memorial.middleware';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { CommonRoutesConfig } from '../commons/common.route';
import { MemorialController } from '../../controllers/memorial.controller';
import { MemorialUserRelationshipController } from '../../controllers/memorial-user-relationship.controller';
import { MemorialRequestController } from '../../controllers/memorial-request.controller';
import { MemorialRequestMiddleware } from '../../middlewares/memorial-request.middleware';

export class MemorialRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'MemorialRoutes');
  }

  configurationRoutes(): express.Application {
    const jwtMiddleware = new JwtMiddleware();
    const memorialMiddleware = new MemorialMiddleware();
    const memorialRequestMiddleware = new MemorialRequestMiddleware();
    const memorialController = new MemorialController();
    const memorialRequestController = new MemorialRequestController();
    const memorialUserRelationshipController = new MemorialUserRelationshipController();

    this.app.get('/memorial/:memorialUrl', [
      memorialMiddleware.validateMemorialUrlParameter,
      memorialController.getByUrl
    ]);

    this.app.get('/memorial/:memorialUrl/admins', [
      memorialMiddleware.validateMemorialUrlParameter,
      memorialUserRelationshipController.getAdminUsersByMemorialUrl // list des admin (string des préférences display name)
    ]);

    this.app.get('/memorial/search/:maxResult', [
      memorialMiddleware.validateSearchParameter,
      memorialController.search
    ]);

    this.app.get('/memorial/searchbyurl/:maxResult/:searchValue', [
      memorialMiddleware.validateSearchByUrlParameter,
      memorialController.searchByUrl
    ]);

    this.app.get('/memorial/:memorialId/relationship', [
      jwtMiddleware.optionalJwt,
      memorialMiddleware.validateMemorialIdParameter,
      memorialUserRelationshipController.getCurrentUserRelationshipByMemorialId
    ]);

    this.app.get('/memorial/request/admin/allowed/:adminId/:requestId', [
      memorialMiddleware.validateAdminIdAndRequestIdParameter,
      memorialRequestController.allowed,
      memorialUserRelationshipController.addApplicantToAdminMemorial,
      memorialRequestController.sendAllowedEmail
    ]);

    this.app.get('/memorial/request/admin/rejected/:adminId/:requestId', [
      memorialMiddleware.validateAdminIdAndRequestIdParameter,
      memorialRequestController.rejected,
      memorialRequestController.sendRejectedEmail
    ]);

    this.app.all('/memorial', jwtMiddleware.validateJwt);
    this.app.all('/memorial/*', jwtMiddleware.validateJwt);
    this.app.all('/memorials/*', jwtMiddleware.validateJwt);

    this.app.get('/memorials/mymemorials', [
      memorialController.getMyMemorials
    ]);

    this.app.post('/memorial', [
      memorialMiddleware.validateCreateMemorialRequest,
      memorialController.create
    ]);

    this.app.put('/memorial/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      memorialMiddleware.validateUpdateMemorialRequest,
      memorialController.update
    ]);

    this.app.post('/memorial/request/admin', [
      memorialRequestMiddleware.validateCreateRequestAdminMemorialRequest,
      memorialRequestController.create,
      memorialRequestController.sendEmail
    ]);

    this.app.delete('/memorial/:memorialUrl', [
      memorialMiddleware.validateMemorialUrlParameter,
      memorialController.delete
    ]);

    return this.app;
  }
}

import express from 'express';
import { CommonRoutesConfig } from '../commons/common.route';
import { UserController } from '../../controllers/user.controller';
import { UserMiddleware } from '../../middlewares/user.middleware';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';

export class UserRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'UserRoutes');
  }

  configurationRoutes(): express.Application {
    const jwtMiddleware = new JwtMiddleware();
    const userMiddleware = new UserMiddleware();
    const userController = new UserController();

    this.app.put('/user/activate/:userId', [
      userMiddleware.validateUserIdParameter,
      userController.activate,
    ]);

    this.app.all('/user', jwtMiddleware.validateJwt);
    this.app.all('/user/*', jwtMiddleware.validateJwt);

    this.app.get('/user', [
      userController.get,
    ]);

    this.app.put('/user', [
      userMiddleware.validateUpdateUserRequest,
      userController.update,
    ]);

    this.app.put('/user/questions', [
      userMiddleware.validateUpdateAnswersRequest,
      userController.updateAnswers,
    ]);

    return this.app;
  }
}

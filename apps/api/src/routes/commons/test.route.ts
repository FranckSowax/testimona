import express from 'express';
import multer from 'multer';
import { AuthController } from '../../controllers/auth.controller';
import { PhotoController } from '../../controllers/photo.controller';
import { TestController } from '../../controllers/test.controller';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { PhotoMiddleware } from '../../middlewares/photo.middleware';
import { CommonRoutesConfig } from './common.route';

export class TestRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'TestRoutes');
  }

  configurationRoutes(): express.Application {
    const jwtMiddleware = new JwtMiddleware();
    const testController = new TestController();
    const authController = new AuthController();
    const photoMiddleware = new PhotoMiddleware();
    const photoController = new PhotoController();

    const os = require('os');
    const upload = multer({ dest: os.tmpdir() });

    this.app.get('/test/email/register', [
      jwtMiddleware.validateJwt,
      authController.sendEmailToActivateAccount,
      testController.close,
    ]);

    this.app.post('/test/photos', upload.array('file'), [
      testController.addUserId,
      photoMiddleware.validateUploadPhotoRequest,
      photoController.uploadToCloudinary, // To Cloudinary
      photoController.createOrUpdateToDb // To Db
    ]);

    // route pour la suppression d'une image => déplace dans le répertoire backup
    // set delete at true for photo table
    this.app.delete('/test/photos', [
      testController.addUserId,
      photoMiddleware.validateDeletePhotoRequest,
      photoController.deleteFromDb, // To Db
      photoController.moveFromCloudinary // To Cloudinary
    ]);

    return this.app;
  }
}

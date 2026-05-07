import express from 'express';
import multer from 'multer';
import { PhotoController } from '../../controllers/photo.controller';
import { CommonMiddlewares } from '../../middlewares/common/common.middleware';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { MemorialMiddleware } from '../../middlewares/memorial.middleware';
import { PhotoMiddleware } from '../../middlewares/photo.middleware';
import { CommonRoutesConfig } from "../commons/common.route";

export class PhotoRoutes extends CommonRoutesConfig {
    constructor(app: express.Application) {
      super(app, 'PhotoRoutes');
    }
  
    configurationRoutes(): express.Application {
        const jwtMiddleware = new JwtMiddleware();
        const commonMiddlewares = new CommonMiddlewares();
        const memorialMiddleware = new MemorialMiddleware();
        const photoMiddleware = new PhotoMiddleware();
        const photoController = new PhotoController();

        this.app.get('/photos/:memorialId', [
            memorialMiddleware.validateMemorialIdParameter,
            commonMiddlewares.validateUrlPaginationQuery,
            photoController.getByMemorialId
        ]);

        this.app.get('/photos/:objectType/:objectId', [
            commonMiddlewares.validateUrlParameterStringObjectId,
            photoMiddleware.validatePhotoTypeParameter,
            photoController.get
        ]);

        this.app.all('/photos', jwtMiddleware.validateJwt);
        this.app.all('/photos/*', jwtMiddleware.validateJwt);

        this.app.put('/photos/:objectId/like', [
            commonMiddlewares.validateUrlParameterStringObjectId,
            photoController.like
          ]);
      
          this.app.put('/photos/:objectId/unlike', [
            commonMiddlewares.validateUrlParameterStringObjectId,
            photoController.unlike
          ]);

        // route pour la suppression d'une image => déplace dans le répertoire backup
        // set delete at true for photo table
        this.app.delete('/photos', [
            jwtMiddleware.validateJwt,
            photoMiddleware.validateDeletePhotoRequest,
            photoController.deleteFromDb, // To Db
            photoController.moveFromCloudinary // To Cloudinary
        ]);

        const os = require('os');
        const upload = multer({ dest: os.tmpdir() });

        this.app.post('/photos', upload.array('file'), [
            jwtMiddleware.validateJwt,
            photoMiddleware.validateUploadPhotoRequest,
            photoController.uploadToCloudinary, // To Cloudinary
            photoController.createOrUpdateToDb // To Db
        ]);

        this.app.put('/photos', upload.array('file'), [
            jwtMiddleware.validateJwt,
            photoMiddleware.validateUpdatePhotoRequest,
            photoController.updatePhotosForObject // To Db
        ]);

        return this.app;
    }
}

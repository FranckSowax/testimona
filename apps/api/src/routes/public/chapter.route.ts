import express from 'express';
import { ChapterMiddleware } from '../../middlewares/chapter.middleware';
import { MemorialMiddleware } from '../../middlewares/memorial.middleware';
import { JwtMiddleware } from '../../middlewares/common/jwt.middleware';
import { CommonRoutesConfig } from '../commons/common.route';
import { ChapterController } from '../../controllers/chapter.controller';

export class ChapterRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'ChapterRoutes');
  }

  configurationRoutes(): express.Application {
    const jwtMiddleware = new JwtMiddleware();
    const chapterMiddleware = new ChapterMiddleware();
    const memorialMiddleware = new MemorialMiddleware();
    const chapterController = new ChapterController();

    this.app.get('/chapter/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      chapterController.getByMemorialId
    ]);

    this.app.all('/chapter', jwtMiddleware.validateJwt);
    this.app.all('/chapter/*', jwtMiddleware.validateJwt);

    this.app.post('/chapter/:memorialId', [
      memorialMiddleware.validateMemorialIdParameter,
      chapterMiddleware.validateCreateChapterRequest,
      chapterController.createWithMemorialId
    ]);

    this.app.get('/chapter/:chapterId/detail', [
      chapterMiddleware.validateChapterIdParameter,
      chapterController.get
    ]);

    this.app.put('/chapter/:chapterId', [
      chapterMiddleware.validateChapterIdParameter,
      chapterMiddleware.validateUpdateChapterRequest,
      chapterController.update
    ]);

    this.app.delete('/chapter/:chapterId', [
      chapterMiddleware.validateChapterIdParameter,
      chapterController.delete
    ]);

    return this.app;
  }
}

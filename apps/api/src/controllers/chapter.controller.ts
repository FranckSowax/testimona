import express from 'express';
import { MemorialService } from '../services/memorial.service';
import {
  BooleanResponseModel,
  ErrorResponseModel,
  ObjectResponseModel,
} from '../models/_.models';
import {
  ErrorCommonResponseEnum,
  ErrorChapterResponseEnum,
  ErrorMemorialResponseEnum,
  ErrorServiceResponseEnum,
  IncludeDataExistsEnum,
} from '../enums/_.enums';
import { ChapterService } from '../services/chapter.service';

export class ChapterController {
  async createWithMemorialId(req: express.Request, res: express.Response) {
    try {
      // find if the memorial existes
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId,
      );
      if (!memorialExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.MemorialNotExist,
            },
            null,
          ),
        );
      }

      // create funeral event with memorialId
      const chapterCreateByMemorialId = await ChapterService.getInstance().createByMemorialId(
        req.body.userId,
        +req.params.memorialId,
        req.body.data,
      );

      const resulOfCreation = (chapterCreateByMemorialId && chapterCreateByMemorialId.id > 0);

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: resulOfCreation,
            error: resulOfCreation ? ErrorCommonResponseEnum.NoError : ErrorChapterResponseEnum.CreateChapterByMemorialIdFailed,
          },
          {
            id: chapterCreateByMemorialId.id,
            createDate: chapterCreateByMemorialId.createDate,
          },
        ),
      );
    } catch (error: any) {
      console.log('catch: create chapter by memorialId failed');
      return res
        .status(500)
        .send({ error: 'create chapter by memorialId failed' });
    }
  }

  async getByMemorialId(req: express.Request, res: express.Response) {
    try {
      // find if the memorial existes
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId,
      );
      if (!memorialExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.MemorialNotExist,
            },
            null,
          ),
        );
      }

      const chaptersInfo = await ChapterService.getInstance().getByMemorialId(+req.params.memorialId, IncludeDataExistsEnum.ActiveData);
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          chaptersInfo,
        ),
      );
    } catch (error: any) {
      console.log('catch: get multiple chapter by memorialId failed');
      return res
        .status(500)
        .send({ error: 'get multiple chapter by memorialId failed' });
    }
  }

  async get(req: express.Request, res: express.Response) {
    try {
      const chapterItem = await ChapterService.getInstance().getById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.chapterId,
      );
      const chapterFound = !!chapterItem && chapterItem.id > 0;

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: chapterFound,
            error: chapterFound
              ? ErrorCommonResponseEnum.NoError
              : ErrorServiceResponseEnum.DataNotFound,
          },
          chapterItem,
        ),
      );
    } catch (err) {
      console.log('catch: get chapter by id failed');
      return res.status(500).send({ error: 'get chapter by id failed' });
    }
  }

  async update(req: express.Request, res: express.Response) {
    try {
      // find if the chapter exists
      const chapterExists = await ChapterService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.chapterId,
      );
      if (!chapterExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorChapterResponseEnum.ChapterNotExist,
            },
            null,
          ),
        );
      }

      // update chapter
      const chapterIsUpdated = await ChapterService.getInstance().update(
        req.body.userId,
        +req.params.chapterId,
        req.body.data,
      );
      if (chapterIsUpdated == null) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorChapterResponseEnum.UpdateChapterFailed,
            },
            null,
          ),
        );
      }

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          chapterIsUpdated,
        ),
      );
    } catch (error: any) {
      console.log('catch: update chapter failed');
      return res
        .status(500)
        .send({ error: 'update chapter failed' });
    }
  }

  async delete(req: express.Request, res: express.Response) {
    try {
      // find if the chapter exists
      const chapterData = await ChapterService.getInstance().getById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.chapterId,
      );
      if (chapterData == null || chapterData.userInfo?.userId != req.body.userId) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorChapterResponseEnum.ChapterNotExist,
            },
            null,
          ),
        );
      }

      const chapterIdDeleted = await ChapterService.getInstance().delete(
        req.body.userId,
        +req.params.chapterId,
      );
      const chapterIsDeleted = chapterIdDeleted === +req.params.chapterId;

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: chapterIsDeleted,
            error: chapterIsDeleted
              ? ErrorCommonResponseEnum.NoError
              : ErrorChapterResponseEnum.DeleteChapterFailed,
          },
          chapterIsDeleted,
        ),
      );
    } catch (err) {
      console.log('catch: delete chapter failed');
      return res.status(500).send({ error: 'delete chapter failed' });
    }
  }
}

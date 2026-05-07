import express from 'express';
import { MemorialService } from '../services/memorial.service';
import {
  BooleanResponseModel,
  ErrorResponseModel,
  ObjectResponseModel,
} from '../models/_.models';
import {
  ErrorBiographyResponseEnum,
  ErrorCommonResponseEnum,
  ErrorMemorialResponseEnum,
  IncludeDataExistsEnum,
} from '../enums/_.enums';
import { BiographyService } from '../services/biography.service';

export class BiographyController {
  async createWithMemorialId(req: express.Request, res: express.Response) {
    try {
      // find if the memorial exists
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

      // create biography with memorialId
      const biographyCreateByMemorialId = await BiographyService.getInstance().createByMemorialId(
        req.body.userId,
        +req.params.memorialId,
        req.body.data,
      );

      const resulOfCreation = (biographyCreateByMemorialId && biographyCreateByMemorialId.id > 0);

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: resulOfCreation,
            error: resulOfCreation ? ErrorCommonResponseEnum.NoError : ErrorBiographyResponseEnum.CreateBiographyByMemorialIdFailed,
          },
          {
            id: biographyCreateByMemorialId.id,
            createDate: biographyCreateByMemorialId.createDate,
          },
        ),
      );
    } catch (error: any) {
      console.log('catch: create funeral by memorialId failed');
      return res
        .status(500)
        .send({ error: 'create funeral by memorialId failed' });
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

      const biographyInfo = await BiographyService.getInstance().getByMemorialId(+req.params.memorialId, IncludeDataExistsEnum.ActiveData);
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          biographyInfo,
        ),
      );
    } catch (error: any) {
      console.log('catch: get biography infos by memorialId failed');
      return res
        .status(500)
        .send({ error: 'get biography infos by memorialId failed' });
    }
  }

  async update(req: express.Request, res: express.Response) {
    try {
      // find if the biography exists
      const biographyExists = await BiographyService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId,
      );
      if (!biographyExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorBiographyResponseEnum.BiographyNotExist,
            },
            null,
          ),
        );
      }

      // update biography
      const biographyIsUpdated = await BiographyService.getInstance().update(
        req.body.userId,
        +req.params.memorialId,
        req.body.data,
      );
      if (biographyIsUpdated == null) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorBiographyResponseEnum.UpdateBiographyFailed,
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
          biographyIsUpdated,
        ),
      );
    } catch (error: any) {
      console.log('catch: update funeral failed');
      return res
        .status(500)
        .send({ error: 'update funeral failed' });
    }
  }
}

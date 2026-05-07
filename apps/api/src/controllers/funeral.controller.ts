import express from 'express';
import { MemorialService } from '../services/memorial.service';
import {
  BooleanResponseModel,
  ErrorResponseModel,
  ObjectResponseModel,
} from '../models/_.models';
import {
  ErrorCommonResponseEnum,
  ErrorFuneralResponseEnum,
  ErrorMemorialResponseEnum,
  IncludeDataExistsEnum,
} from '../enums/_.enums';
import { FuneralService } from '../services/funeral.service';

export class FuneralController {
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

      // create funeral with memorialId
      const funeralCreateByMemorialId = await FuneralService.getInstance().createByMemorialId(
        req.body.userId,
        +req.params.memorialId,
        req.body.data,
      );

      const resulOfCreation = (funeralCreateByMemorialId && funeralCreateByMemorialId.id > 0);

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: resulOfCreation,
            error: resulOfCreation ? ErrorCommonResponseEnum.NoError : ErrorFuneralResponseEnum.CreateFuneralByMemorialIdFailed,
          },
          {
            id: funeralCreateByMemorialId.id,
            createDate: funeralCreateByMemorialId.createDate,
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

      const funeralInfo = await FuneralService.getInstance().getByMemorialId(+req.params.memorialId, IncludeDataExistsEnum.ActiveData);
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          funeralInfo,
        ),
      );
    } catch (error: any) {
      console.log('catch: get funeral infos by memorialId failed');
      return res
        .status(500)
        .send({ error: 'get funeral infos by memorialId failed' });
    }
  }

  async update(req: express.Request, res: express.Response) {
    try {
      // find if the funeral exists
      const funeralExists = await FuneralService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId,
      );
      if (!funeralExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorFuneralResponseEnum.FuneralNotExist,
            },
            null,
          ),
        );
      }

      // update funeral
      const funeralIsUpdated = await FuneralService.getInstance().update(
        req.body.userId,
        +req.params.memorialId,
        req.body.data,
      );
      if (funeralIsUpdated == null) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorFuneralResponseEnum.UpdateFuneralFailed,
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
          funeralIsUpdated,
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

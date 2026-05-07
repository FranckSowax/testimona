import express from 'express';
import { MemorialService } from '../services/memorial.service';
import {
  BooleanResponseModel,
  ErrorResponseModel,
  ObjectResponseModel,
} from '../models/_.models';
import {
  ErrorCommonResponseEnum,
  ErrorFuneralEventResponseEnum,
  ErrorMemorialResponseEnum,
  ErrorServiceResponseEnum,
  IncludeDataExistsEnum,
} from '../enums/_.enums';
import { FuneralEventService } from '../services/funeral-event.service';

export class FuneralEventController {
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
      const funeralEventCreateByMemorialId = await FuneralEventService.getInstance().createByMemorialId(
        req.body.userId,
        +req.params.memorialId,
        req.body.data,
      );

      const resulOfCreation = (funeralEventCreateByMemorialId && funeralEventCreateByMemorialId.id > 0);

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: resulOfCreation,
            error: resulOfCreation ? ErrorCommonResponseEnum.NoError : ErrorFuneralEventResponseEnum.CreateFuneralEventByMemorialIdFailed,
          },
          {
            id: funeralEventCreateByMemorialId.id,
            createDate: funeralEventCreateByMemorialId.createDate,
          },
        ),
      );
    } catch (error: any) {
      console.log('catch: create funeralEvent by memorialId failed');
      return res
        .status(500)
        .send({ error: 'create funeralEvent by memorialId failed' });
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

      const funeralEventsInfo = await FuneralEventService.getInstance().getByMemorialId(+req.params.memorialId, IncludeDataExistsEnum.ActiveData);
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          funeralEventsInfo,
        ),
      );
    } catch (error: any) {
      console.log('catch: get multiple funeralEvent by memorialId failed');
      return res
        .status(500)
        .send({ error: 'get multiple funeralEvent by memorialId failed' });
    }
  }

  async get(req: express.Request, res: express.Response) {
    try {
      const funeralEventItem = await FuneralEventService.getInstance().getById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.funeralEventId,
      );
      const funeralEventFound = !!funeralEventItem && funeralEventItem.id > 0;

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: funeralEventFound,
            error: funeralEventFound
              ? ErrorCommonResponseEnum.NoError
              : ErrorServiceResponseEnum.DataNotFound,
          },
          funeralEventItem,
        ),
      );
    } catch (err) {
      console.log('catch: get funeral event by id failed');
      return res.status(500).send({ error: 'get funeral event by id failed' });
    }
  }

  async update(req: express.Request, res: express.Response) {
    try {
      // find if the funeralEvent exists
      const funeralEventExists = await FuneralEventService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.funeralEventId,
      );
      if (!funeralEventExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorFuneralEventResponseEnum.FuneralEventNotExist,
            },
            null,
          ),
        );
      }

      // update funeralEvent
      const funeralEventIsUpdated = await FuneralEventService.getInstance().update(
        req.body.userId,
        +req.params.funeralEventId,
        req.body.data,
      );
      if (funeralEventIsUpdated == null) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorFuneralEventResponseEnum.UpdateFuneralEventFailed,
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
          funeralEventIsUpdated,
        ),
      );
    } catch (error: any) {
      console.log('catch: update funeralEvent failed');
      return res
        .status(500)
        .send({ error: 'update funeralEvent failed' });
    }
  }

  async delete(req: express.Request, res: express.Response) {
    try {
      // find if the funeralEvent exists
      const funeralEventData = await FuneralEventService.getInstance().getById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.funeralEventId,
      );
      if (funeralEventData == null || funeralEventData.userInfo?.userId != req.body.userId) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorFuneralEventResponseEnum.FuneralEventNotExist,
            },
            null,
          ),
        );
      }

      const funeralEventIdDeleted = await FuneralEventService.getInstance().delete(
        req.body.userId,
        +req.params.funeralEventId,
      );
      const funeralEventIsDeleted = funeralEventIdDeleted === +req.params.testimonialId;

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: funeralEventIsDeleted,
            error: funeralEventIsDeleted
              ? ErrorCommonResponseEnum.NoError
              : ErrorFuneralEventResponseEnum.DeleteFuneralEventFailed,
          },
          funeralEventIsDeleted,
        ),
      );
    } catch (err) {
      console.log('catch: delete funeral event failed');
      return res.status(500).send({ error: 'delete funeral event failed' });
    }
  }
}

import express from 'express';
import { MemorialService } from '../services/memorial.service';
import {
  BooleanResponseModel,
  ErrorResponseModel,
  ObjectResponseModel,
} from '../models/_.models';
import {
  ErrorCommonResponseEnum,
  ErrorMemorialResponseEnum,
  ErrorServiceResponseEnum,
  IncludeDataExistsEnum,
} from '../enums/_.enums';
import { MemorialHelpers, StringHelpers } from '../helpers/_.helpers';
import { DonationService } from '../services/donation.service';

export class MemorialController {
  //#region Admin
  async getAll(req: express.Request, res: express.Response) {
    try {
      const result = await MemorialService.getInstance().getAll(+req.query.page!, +req.query.pgSize!);

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: !!result,
            error: !!result
              ? ErrorCommonResponseEnum.NoError
              : ErrorServiceResponseEnum.DataNotFound,
          },
          result,
        ),
      );
    } catch (err) {
      console.log('catch: get my memorials failed');
      return res.status(500).send({ error: 'get my memorials failed' });
    }
  }
  //#endregion

  //#region Public
  async create(req: express.Request, res: express.Response) {
    try {
      const numberSimilarUrls = await MemorialService.getInstance().numberSimilarUrls(
        IncludeDataExistsEnum.AllData,
        `${req.body.data.firstname} ${req.body.data.lastname}`,
      );

      const memorialCreated = await MemorialService.getInstance().create(
        req.body.userId,
        req.body.data, 
        MemorialHelpers.prepareUrl(req.body.data.firstname, req.body.data.lastname, req.body.data.yearOfDeath, numberSimilarUrls),
      );
      if (
        !memorialCreated ||
        memorialCreated.id == 0 ||
        memorialCreated.url == ''
      ) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.CreateMemorialFailed,
            },
            null,
          ),
        );  
      }

      const createDonationGoalLine = await DonationService.getInstance().createDonationGoalByMemorialId(memorialCreated.id);

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          {
            id: memorialCreated.id,
            url: memorialCreated.url,
          },
        ),
      );
    } catch (err) {
      console.log('catch: create memorial failed');
      return res.status(500).send({ error: 'create memorial failed' });
    }
  }

  async getByUrl(req: express.Request, res: express.Response) {
    try {
      const memorialItem = await MemorialService.getInstance().getByUrl(
        IncludeDataExistsEnum.ActiveData,
        StringHelpers.removeAccent(req.params.memorialUrl.toLocaleLowerCase().trim()),
      );
      const memorialFound = !!memorialItem && memorialItem.id > 0;

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: memorialFound,
            error: memorialFound
              ? ErrorCommonResponseEnum.NoError
              : ErrorServiceResponseEnum.DataNotFound,
          },
          memorialItem,
        ),
      );
    } catch (err) {
      console.log('catch: get memorial by url failed');
      return res.status(500).send({ error: 'get memorial by url failed' });
    }
  }

  async getMyMemorials(req: express.Request, res: express.Response) {
    try {
      const memorialItems = await MemorialService.getInstance().getMyMemorials(req.body.userId);

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: !!memorialItems,
            error: !!memorialItems
              ? ErrorCommonResponseEnum.NoError
              : ErrorServiceResponseEnum.DataNotFound,
          },
          memorialItems,
        ),
      );
    } catch (err) {
      console.log('catch: get my memorials failed');
      return res.status(500).send({ error: 'get my memorials failed' });
    }
  }

  async searchByUrl(req: express.Request, res: express.Response) {
    try {
      const memorialItems = await MemorialService.getInstance().searchByUrl(
        IncludeDataExistsEnum.ActiveData,
        StringHelpers.removeAccent(req.params.searchValue.toLocaleLowerCase().trim()),
        +req.params.maxResult,
      );
      const memorialsFound = !!memorialItems;
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: memorialsFound,
            error: memorialsFound
              ? ErrorCommonResponseEnum.NoError
              : ErrorServiceResponseEnum.DataNotFound,
          },
          memorialItems,
        ),
      );
    } catch (err) {
      console.log('catch: search memorial by url for autocomplete failed');
      return res
        .status(500)
        .send({ error: 'search memorial by url for autocomplete failed' });
    }
  }

  async search(req: express.Request, res: express.Response) {
    try {
      const memorialItems = await MemorialService.getInstance().search(
        IncludeDataExistsEnum.ActiveData,
        req.query.firstname ? StringHelpers.removeAccent(req.query.firstname.toString().toLocaleLowerCase().trim()) : undefined,
        req.query.lastname ? StringHelpers.removeAccent(req.query.lastname.toLocaleString().toLocaleLowerCase().trim()): undefined,
        req.query.year?.toLocaleString().toLocaleLowerCase().trim(),
        req.query.country?.toLocaleString().toLocaleLowerCase().trim(),
        +req.params.maxResult,
      );
      const memorialsFound = !!memorialItems;
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: memorialsFound,
            error: memorialsFound
              ? ErrorCommonResponseEnum.NoError
              : ErrorServiceResponseEnum.DataNotFound,
          },
          memorialItems,
        ),
      );
    } catch (err) {
      console.log('catch: search memorial by properties failed');
      return res
        .status(500)
        .send({ error: 'search memorial by properties failed' });
    }
  }

  async update(req: express.Request, res: express.Response) {
    try {
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId,
      );
      if (!memorialExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorServiceResponseEnum.DataNotFound,
            },
            null,
          ),
        );
      }

      let currentMemorialUrl = await MemorialService.getInstance().getMemorialUrl(+req.params.memorialId, IncludeDataExistsEnum.ActiveData);      
      if (!MemorialHelpers.compareUrl(currentMemorialUrl, req.body.data.firstname, req.body.data.lastname, req.body.data.yearOfDeath)) {
        const numberSimilarUrls = await MemorialService.getInstance().numberSimilarUrls(
          IncludeDataExistsEnum.AllData,
          `${req.body.data.firstname} ${req.body.data.lastname}`,
        );
        currentMemorialUrl = MemorialHelpers.prepareUrl(req.body.data.firstname, req.body.data.lastname, req.body.data.yearOfDeath, numberSimilarUrls);
      }

      const memorialIsUpdated = await MemorialService.getInstance().update(
        req.body.userId,
        +req.params.memorialId,
        currentMemorialUrl,
        req.body.data
      );
      if (!memorialIsUpdated) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.UpdateMemorialFailed,
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
          memorialIsUpdated,
        ),
      );
    } catch (err) {
      console.log('catch: update memorial failed');
      return res.status(500).send({ error: 'update memorial failed' });
    }
  }

  async delete(req: express.Request, res: express.Response) {
    try {
      const memorialExists = await MemorialService.getInstance().existsByUrl(
        IncludeDataExistsEnum.ActiveData,
        StringHelpers.removeAccent(req.params.memorialUrl.toLocaleLowerCase().trim()),
      );
      if (!memorialExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorServiceResponseEnum.DataNotFound,
            },
            null,
          ),
        );
      }

      const memorialIdDeleted = await MemorialService.getInstance().delete(
        req.body.userId,
        req.params.memorialUrl,
      );
      const memorialIsDeleted = memorialIdDeleted === req.params.memorialUrl;

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: memorialIsDeleted,
            error: memorialIsDeleted
              ? ErrorCommonResponseEnum.NoError
              : ErrorMemorialResponseEnum.DeleteMemorialFailed,
          },
          memorialIsDeleted,
        ),
      );
    } catch (err) {
      console.log('catch: delete memorial failed');
      return res.status(500).send({ error: 'delete memorial failed' });
    }
  }
  //#endregion
}

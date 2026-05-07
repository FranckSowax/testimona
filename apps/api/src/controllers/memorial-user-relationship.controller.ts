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
  ErrorMemorialUserRelationshipResponseEnum,
  ErrorUserResponseEnum,
  IncludeDataExistsEnum,
} from '../enums/_.enums';
import { MemorialUserRelationshipService } from '../services/memorial-user-relationship.service';
import { StringHelpers } from '../helpers/_.helpers';
import { Relative } from '@prisma/client';
import { MemorialRequestModel } from '../models/services/memorial-request.model';
import { UserService } from '../services/user.service';

export class MemorialUserRelationshipController {
  //#region Admin
  async getAdminUsersByMemorialId(req: express.Request, res: express.Response) {
    try {
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.AllData,
        +req.params.memorialId,
      );

      if (!memorialExists) {
        return res.status(500).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.MemorialNotExist,
            },
            null,
          ),
        );
      }

      // get all admin users for a memorial
      const memorialAdminUsers = await MemorialUserRelationshipService.getInstance().getMemorialAdminUsers(+req.params.memorialId);
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError
          },
          memorialAdminUsers
        ),
      );
    } catch (err) {
      console.log('catch: get list of admin users for a memorial failed');
      return res
        .status(500)
        .send({ error: 'get list of admin users for a memorial failed' });
    }
  }
  //#endregion

  //#region Public
  async addApplicantToAdminMemorial(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const requestItem = <MemorialRequestModel>(req.body.request);
      // find if the memorial exists
      const memorialExists = await MemorialService.getInstance().existsById(IncludeDataExistsEnum.ActiveData, requestItem.memorialId);
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

      // find if the applicant exists
      const applicantExists = await UserService.getInstance().existsById(requestItem.applicantId);
      if (!applicantExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorUserResponseEnum.UserNotExist,
            },
            null,
          ),
        );
      }

      // save the relationship between the user and the memorial
      const addRelationshipResult = await MemorialUserRelationshipService.getInstance().addMemorialRelationship(
        requestItem.applicantId,
        requestItem.memorialId,
        requestItem.relationship,
        true);

      if (!addRelationshipResult) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorMemorialUserRelationshipResponseEnum.AddAdminToMemorialFailed,
            },
            false,
          ),
        );
      }

      return next();
    } catch (error: any) {
      console.log('catch: add applicant to be admin of a memorial failed');
      return res
        .status(500)
        .send({ error: 'add applicant to be admin of a memorial failed' });
    }
  }

  async getCurrentUserRelationshipByMemorialId(req: express.Request, res: express.Response) {
    try {
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId,
      );

      if (!memorialExists) {
        return res.status(500).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.MemorialNotExist,
            },
            null,
          ),
        );
      }

      // get the relationship for the current and the memorial
      const relationshipData = await MemorialUserRelationshipService.getInstance().getMemorialRelationshipForCurrentUser(+req.params.memorialId, req.body.userId);
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError
          },
          {
            relationship: relationshipData.userId != '' ? relationshipData.relationship : Relative.Undefined,
            isAdmin: relationshipData.userId != '' ? relationshipData.isAdmin : false
          },
        ),
      );
    } catch (err) {
      console.log('catch: get memorial relationship by id failed');
      return res.status(500).send({ error: 'get memorial relationship by id failed' });
    }
  }

  async getAdminUsersByMemorialUrl(req: express.Request, res: express.Response) {
    try {
      const memorialData = await MemorialService.getInstance().getByUrl(
        IncludeDataExistsEnum.ActiveData,
        StringHelpers.removeAccent(req.params.memorialUrl.toLocaleLowerCase().trim()),
      );

      if (!memorialData) {
        return res.status(500).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.MemorialNotExist,
            },
            null,
          ),
        );
      }

      // get all admin users for a memorial
      const memorialAdminUsers = await MemorialUserRelationshipService.getInstance().getMemorialAdminUsers(memorialData.id);
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError
          },
          memorialAdminUsers
        ),
      );
    } catch (err) {
      console.log('catch: get list of admin users for a memorial failed');
      return res
        .status(500)
        .send({ error: 'get list of admin users for a memorial failed' });
    }
  }
  //#endregion
}

import express from 'express';
import { MemorialService } from '../services/memorial.service';
import {
  BooleanResponseModel,
  ErrorResponseModel,
} from '../models/_.models';
import {
  ErrorCommonResponseEnum,
  ErrorMemorialRequestResponseEnum,
  ErrorMemorialResponseEnum,
  ErrorUserResponseEnum,
  IncludeDataExistsEnum,
} from '../enums/_.enums';
import { MemorialRequestService } from '../services/memorial-request.service';
import { MemorialRequestAdminStatus } from '@prisma/client';
import { MailService } from '../services/mail.service';
import { MemorialUserRelationshipService } from '../services/memorial-user-relationship.service';
import _ from 'lodash';
import { MemorialRequestModel } from '../models/services/memorial-request.model';
import { UserService } from '../services/user.service';

export class MemorialRequestController {
  async create(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.body.data.memorialId,
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

      const requestCreated = await MemorialRequestService.getInstance().create(
        req.body.userId,
        req.body.data
      );

      const memorialRequestIsCreated = (requestCreated && requestCreated.id != '' && requestCreated.status == MemorialRequestAdminStatus.Pending);
      if (!memorialRequestIsCreated) {
          return res.status(200).send(
            new BooleanResponseModel(
              {
                success: false,
                error: ErrorMemorialRequestResponseEnum.CreateMemorialRequestFailed,
              },
              false,
            ),
          );
      }

      req.body.data.adminRequestId = requestCreated.id;
      return next();
    } catch (err) {
      console.log('catch: request admin memorial failed');
      return res.status(500).send({ error: 'request admin memorial failed' });
    }
  }

  async allowed(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const requestItem = await MemorialRequestService.getInstance().getById(req.params.requestId);
      const requestExists = (requestItem && requestItem.id == req.params.requestId && requestItem.status == MemorialRequestAdminStatus.Pending);
      if (!requestExists) {
          return res.status(200).send(
            new BooleanResponseModel(
              {
                success: false,
                error: ErrorMemorialRequestResponseEnum.MemorialRequestNotFound,
              },
              false,
            ),
          );
      }

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

      const adminUserExists = await UserService.getInstance().getById(req.params.adminId);
      if (!adminUserExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorUserResponseEnum.AdminNotExist,
            },
            null,
          ),
        );
      }

      const requestUpdated = await MemorialRequestService.getInstance().update(requestItem.id, MemorialRequestAdminStatus.Accepted, req.params.adminId);
      if (!requestUpdated) {
          return res.status(200).send(
            new BooleanResponseModel(
              {
                success: false,
                error: ErrorMemorialRequestResponseEnum.MemorialRequestAcceptedNotUpdated,
              },
              false,
            ),
          );
      }

      req.body.request = requestItem;
      return next();
    } catch (err) {
      console.log('catch: allowed request admin failed');
      return res.status(500).send({ error: 'allowed request admin failed' });
    }
  }

  async rejected(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const requestItem = await MemorialRequestService.getInstance().getById(req.params.requestId);
      const requestExists = (requestItem && requestItem.id == req.params.requestId && requestItem.status == MemorialRequestAdminStatus.Pending);
      if (!requestExists) {
          return res.status(200).send(
            new BooleanResponseModel(
              {
                success: false,
                error: ErrorMemorialRequestResponseEnum.MemorialRequestNotFound,
              },
              false,
            ),
          );
      }

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

      const adminUserExists = await UserService.getInstance().getById(req.params.adminId);
      if (!adminUserExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorUserResponseEnum.AdminNotExist,
            },
            null,
          ),
        );
      }

      const requestUpdated = await MemorialRequestService.getInstance().update(requestItem.id, MemorialRequestAdminStatus.Rejected, req.params.adminId);
      if (!requestUpdated) {
          return res.status(200).send(
            new BooleanResponseModel(
              {
                success: false,
                error: ErrorMemorialRequestResponseEnum.MemorialRequestRejectedNotUpdated,
              },
              false,
            ),
          );
      }

      req.body.request = requestItem;
      return next();
    } catch (err) {
      console.log('catch: allowed request admin failed');
      return res.status(500).send({ error: 'allowed request admin failed' });
    }
  }

  async sendEmail(req: express.Request, res: express.Response) {
    try {
      const memorialInfos = await MemorialService.getInstance().getById(IncludeDataExistsEnum.ActiveData, req.body.data.memorialId);
      if (memorialInfos == null) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorMemorialRequestResponseEnum.SendEmailRequestMemorialNotFound,
            },
            false,
          )
        );
      }

      const memorialAdmins = await MemorialUserRelationshipService.getInstance().getMemorialAdminUsersForRequestEmail(memorialInfos.id);
      if (memorialAdmins == null || memorialAdmins.length == 0) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorMemorialRequestResponseEnum.SendEmailRequestAdministratorsNotFound,
            },
            false,
          )
        );
      }

      const emailResult = await MailService.getInstance().sendEmailAdminRequestMemorial(_.map(memorialAdmins, 'email'), memorialInfos, req.body.data.adminRequestId, req.body.data.relative, req.body.data.note);
      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: emailResult.success,
            error: emailResult.success
              ? ErrorCommonResponseEnum.NoError
              : ErrorMemorialRequestResponseEnum.SendEmailRequestMemorialFailed,
          },
          emailResult.success,
        ),
      );
    } catch (error) {
      console.log('catch: send request admin memorial failed');
      return res.status(500).send({ error: 'send request admin memorial failed' });
    }
  }

  async sendAllowedEmail(req: express.Request, res: express.Response) {
    try {
      const requestItem = <MemorialRequestModel>(req.body.request);
      const memorialInfos = await MemorialService.getInstance().getById(IncludeDataExistsEnum.ActiveData, requestItem.memorialId);
      if (memorialInfos == null) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorMemorialRequestResponseEnum.SendAllowedRequestEmailMemorialNotFound,
            },
            false,
          )
        );
      }

      const applicantData = await UserService.getInstance().getById(requestItem.applicantId);
      if (applicantData == null || applicantData.userId == '') {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorMemorialRequestResponseEnum.SendAllowedRequestEmailApplicantNotFound,
            },
            false,
          )
        );
      }

      const emailResult = await MailService.getInstance().sendAllowedRequestEmailToApplicant(applicantData, memorialInfos);
      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: emailResult.success,
            error: emailResult.success
              ? ErrorCommonResponseEnum.NoError
              : ErrorMemorialRequestResponseEnum.SendAllowedRequestEmailFailed,
          },
          emailResult.success,
        ),
      );
    } catch (error) {
      console.log('catch: send email for allowed request to user failed');
      return res.status(500).send({ error: 'send email for allowed request to user failed' });
    }
  }

  async sendRejectedEmail(req: express.Request, res: express.Response) {
    try {
      const requestItem = <MemorialRequestModel>(req.body.request);
      const memorialInfos = await MemorialService.getInstance().getById(IncludeDataExistsEnum.ActiveData, requestItem.memorialId);
      if (memorialInfos == null) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorMemorialRequestResponseEnum.SendRejectedRequestEmailMemorialNotFound,
            },
            false,
          )
        );
      }

      const applicantData = await UserService.getInstance().getById(requestItem.applicantId);
      if (applicantData == null || applicantData.userId == '') {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorMemorialRequestResponseEnum.SendRejectedRequestEmailApplicantNotFound,
            },
            false,
          )
        );
      }

      const emailResult = await MailService.getInstance().sendRejectedRequestEmailToApplicant(applicantData, memorialInfos);
      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: emailResult.success,
            error: emailResult.success
              ? ErrorCommonResponseEnum.NoError
              : ErrorMemorialRequestResponseEnum.SendRejectedRequestEmailFailed,
          },
          emailResult.success,
        ),
      );
    } catch (error) {
      console.log('catch: send email for rejected request to user failed');
      return res.status(500).send({ error: 'send email for rejected request to user failed' });
    }
  }
}

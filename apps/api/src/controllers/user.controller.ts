import { AuthenticationMode } from '@prisma/client';
import express from 'express';
import { each, forEach } from 'lodash';
import { ErrorCommonResponseEnum, ErrorServiceResponseEnum, ErrorUserResponseEnum } from '../enums/_.enums';
import { PrivatePwdKey, SecretAnswerKey } from '../helpers/constantes/_.constantes';
import { UpdateAnswerRequestModel, UpdateUserRequestModel } from '../models/requests/users.model';
import { UserResponseModel } from '../models/responses/user.model';
import { BooleanResponseModel, ErrorResponseModel, ObjectResponseModel } from '../models/_.models';
import { CryptoService } from '../services/commons/crypto.service';
import { SecurityQuestionService } from '../services/security-question.service';
import { UserService } from '../services/user.service';

export class UserController {
  async activate(req: express.Request, res: express.Response) {
    try {
      const accountToActivated = await UserService.getInstance().accountToActivated(
        req.params.userId
      );

      if (accountToActivated == false) {
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

      const activateAccount = await UserService.getInstance().activateAccount(
        req.params.userId,
      );

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          activateAccount,
        ),
      );
    } catch (err) {
      console.log('catch: activate account failed');
      return res.status(500).send({ error: 'activate account failed' });
    }
  }

  async get(req: express.Request, res: express.Response) {
    try {
      const userData = await UserService.getInstance().getById(
        req.body.userId
      );
      const userFound = !!userData && userData.userId != '';

      let questionsData = new Array<any>();
      if (userData?.loginType == AuthenticationMode.Site) {
        questionsData = await SecurityQuestionService.getInstance().getQuestions(
          req.body.userId
        );
      }

      let returnUserData: UserResponseModel | null = null;
      if (userFound) {
        returnUserData = new UserResponseModel(userData.email, userData.firstname, userData.lastname,
          userData.nickname, userData.loginType, userData.language, userData.photos);
      }

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: userFound,
            error: userFound
              ? ErrorCommonResponseEnum.NoError
              : ErrorServiceResponseEnum.DataNotFound,
          },
          { userData: returnUserData, questionsData },
        ),
      );
    } catch (err) {
      console.log('catch: get my settings failed');
      return res.status(500).send({ error: 'get my settings failed' });
    }
  }

  async update(req: express.Request, res: express.Response) {
    try {
      // find if the user exists
      const userData = await UserService.getInstance().getById(
        req.body.userId
      );
      const userFound = !!userData && userData.userId != '';
      if (!userFound) {
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

      // update user
      const updateUserData = req.body.data as UpdateUserRequestModel;
      const userIsUpdated = await UserService.getInstance().update(
        req.body.userId,
        updateUserData,
      );

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: userIsUpdated,
            error: userIsUpdated ? ErrorCommonResponseEnum.NoError : ErrorUserResponseEnum.UpdateUserFailed,
          },
          userIsUpdated,
        ),
      );
    } catch (error: any) {
      console.log('catch: update my settings failed');
      return res
        .status(500)
        .send({ error: 'update my settings failed' });
    }
  }

  async updateAnswers(req: express.Request, res: express.Response) {
    try {
      // find if the user exists
      const userData = await UserService.getInstance().getById(
        req.body.userId
      );
      const userFound = userData != null && userData.userId != '';
      if (!userFound) {
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

      // Decrypt/Re-encrypt security answer
      let answerAreUpdated: boolean = false;
      const updateAnswersData = req.body.data.answers as UpdateAnswerRequestModel[];
      forEach(updateAnswersData, (async (securityQuestion: UpdateAnswerRequestModel) => {
        // Decrypt answer
        const decryptAnswer = await CryptoService.getInstance().decryptAnswer(securityQuestion.answer, PrivatePwdKey);
        // Re-encrypt answer
        securityQuestion.answer = await CryptoService.getInstance().encryptAnswer(decryptAnswer, SecretAnswerKey);
        // add new awser
        answerAreUpdated = await UserService.getInstance().updateAnswer(req.body.userId, securityQuestion);
      }));

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: answerAreUpdated,
            error: answerAreUpdated ? ErrorCommonResponseEnum.NoError : ErrorUserResponseEnum.UpdateAnswersFailed,
          },
          answerAreUpdated,
        ),
      );
    } catch (error: any) {
      console.log('catch: update security answer failed');
      return res
        .status(500)
        .send({ error: 'update security answer failed' });
    }
  }
}

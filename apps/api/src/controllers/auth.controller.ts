import express from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticationMode, UserRole } from '.prisma/client';
import { UserService } from '../services/user.service';
import {
  BooleanResponseModel,
  ErrorResponseModel,
  SocialUserModel,
  UserServiceModel,
} from '../models/_.models';
import {
  ErrorAuthResponseEnum,
  ErrorCommonResponseEnum,
  ErrorServiceResponseEnum,
} from '../enums/_.enums';
import _ from 'lodash';
import { CryptoService } from '../services/commons/crypto.service';
import { PrivatePwdKey, SecretPwdKey, SecretAnswerKey } from '../helpers/constantes/_.constantes';
import { MailService } from '../services/mail.service';

export class AuthController {
  async emailexists(req: express.Request, res: express.Response) {
    try {
      const emailExists = await UserService.getInstance().emailAlreadyExists(
        req.body.data.email,
      );

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          emailExists,
        ),
      );
    } catch (err) {
      console.log('catch: register email exists failed');
      return res.status(500).send({ error: 'register email exists failed' });
    }
  }

  async register(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      // Decrypt password from frontend transport encryption
      const plainPassword = await CryptoService.getInstance().decryptFromFrontend(req.body.data.password, PrivatePwdKey);
      // Hash password with bcrypt (secure one-way hash)
      req.body.data.password = await CryptoService.getInstance().hashPassword(plainPassword);

      // Decrypt/Re-encrypt security answers
      for (const securityQuestion of req.body.data.questions) {
        const decryptAnswer = await CryptoService.getInstance().decryptAnswer(securityQuestion.answer, PrivatePwdKey);
        securityQuestion.answer = await CryptoService.getInstance().encryptAnswer(decryptAnswer, SecretAnswerKey);
      }

      const newUserId = await AuthService.getInstance().register(req.body.data);
      if (newUserId == '') {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorAuthResponseEnum.RegisterFailed,
            },
            null,
          ),
        );
      }

      req.body.userId = newUserId;
      req.body.data.role = UserRole.User;

      next();
    } catch (err) {
      return res.status(500).send({ error: 'register failed' });
    }
  }

  async sendEmailToActivateAccount(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      if ((<any>AuthenticationMode)[req.body.data.loginType] == AuthenticationMode.Site) {
        const emailResult = await MailService.getInstance().sendEmailActivateAccount(req.body.data.email, req.body.userId, req.body.data.firstname, req.body.data.lastname, req.body.data.language);
      }

      return next();
    } catch (error: any) {
      console.log('catch: send register email failed');
      return res.status(500).send({ error: 'send register email failed' });
    }
  }

  async login(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let userData: UserServiceModel | undefined;
      switch ((<any>AuthenticationMode)[req.body.data.loginType]) {
        case AuthenticationMode.Site:
          userData = await AuthService.getInstance().loginSiteByEmail(
            req.body.data.email,
          );
          break;
        default:
          break;
      }

      if (!userData) {
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

      // Decrypt the password sent from the frontend (transport encryption)
      const plainPassword = await CryptoService.getInstance().decryptFromFrontend(req.body.data.password, PrivatePwdKey);
      delete req.body.data.password;

      let passwordMatch = false;

      if (CryptoService.getInstance().isLegacyPassword(userData.password)) {
        // Legacy AES-encrypted password: decrypt and compare, then migrate to bcrypt
        const legacyPlain = await CryptoService.getInstance().decryptLegacyPassword(userData.password, SecretPwdKey);
        passwordMatch = (plainPassword === legacyPlain);

        if (passwordMatch) {
          // Migrate to bcrypt transparently
          const bcryptHash = await CryptoService.getInstance().hashPassword(plainPassword);
          await UserService.getInstance().updatePassword(userData.userId, bcryptHash);
        }
      } else {
        // Bcrypt password: use secure comparison
        passwordMatch = await CryptoService.getInstance().verifyPassword(plainPassword, userData.password);
      }

      if (!passwordMatch) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorAuthResponseEnum.LoginFailed,
            },
            null,
          ),
        );
      }

      req.body.userId = userData.userId;
      req.body.data.firstname = userData.firstname;
      req.body.data.lastname = userData.lastname;
      req.body.data.nickname = userData.nickname;
      req.body.data.displayName = userData.displayName;
      req.body.data.role = userData.role;
      req.body.data.language = userData.language.code;

      next();
    } catch (err) {
      return res.status(500).send({ error: 'login failed' });
    }
  }
  
  async relogin(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      const userData = await AuthService.getInstance().loginSiteByUserId(
        req.body.userId,
      );

      if (!userData) {
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

      req.body.userId = userData.userId;
      req.body.data = {};
      req.body.data.firstname = userData.firstname;
      req.body.data.lastname = userData.lastname;
      req.body.data.nickname = userData.nickname;
      req.body.data.displayName = userData.displayName;
      req.body.data.role = userData.role;
      req.body.data.language = userData.language.code;

      next();
    } catch (error: any) {
      console.log('catch: relogin failed');
      return res.status(500).send({ error: 'relogin failed' });
    }
  }

  async loginSocialMedia(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    try {
      let userData: UserServiceModel | null = null;
      let socialUserData: SocialUserModel | null = null;

      switch ((<any>AuthenticationMode)[req.body.data.loginType]) {
        case AuthenticationMode.Facebook:
          socialUserData = await AuthService.getInstance().loginSocialMedia(
            AuthenticationMode.Facebook,
            {
              accessToken: req.body.data.access_token,
              language: req.body.data.language,
            },
            null,
          );

          if (socialUserData && socialUserData!.email != undefined) {
            // Check if the user exists
            userData = await UserService.getInstance().getByEmail(
              socialUserData!.email,
            );
          }
          break;
        case AuthenticationMode.Google:
          // Check if the user exists
          userData = await UserService.getInstance().getBySocialUserId(
            req.body.data.id,
          );

          if (!userData) {
            socialUserData = await AuthService.getInstance().loginSocialMedia(
              AuthenticationMode.Google,
              null,
              {
                accessToken: req.body.data.access_token,
                idToken: req.body.data.id_token,
              },
            );
          }
          break;
        default:
          userData = null;
          socialUserData = null;
          break;
      }

      if (!socialUserData && !userData) {
        // An error is occured
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorAuthResponseEnum.LoginSocialMediaFailed,
            },
            null,
          ),
        );
      }

      if (
        socialUserData &&
        (!socialUserData.socialMediaUserId || !socialUserData.email)
      ) {
        // Email is mandatory
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorAuthResponseEnum.EmailSocialMediaRequired,
            },
            null,
          ),
        );
      }

      // Create user
      if (!userData) {
        userData = await AuthService.getInstance().registerSocialMedia(
          socialUserData!,
        );
      }

      if (!userData) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorAuthResponseEnum.RegisterSocialMediaFailed,
            },
            null,
          ),
        );
      }

      req.body.userId = userData?.userId;
      req.body.data.firstname = userData
        ? userData.firstname
        : socialUserData?.firstname;
      req.body.data.lastname = userData
        ? userData.lastname
        : socialUserData?.lastname;
      req.body.data.nickname = userData
        ? userData.nickname
        : socialUserData?.nickname;
      req.body.data.displayName = userData?.displayName;
      req.body.data.role = userData?.role;
      req.body.data.language = userData
        ? userData.language.code
        : socialUserData?.language;

      delete req.body.data.access_token;
      delete req.body.data.id_token;
      delete req.body.data.id;

      next();
    } catch (err) {
      console.log('catch: login failed');
      return res.status(500).send({ error: 'login failed' });
    }
  }
}

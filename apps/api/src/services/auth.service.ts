import {
  AuthenticationMode,
  DisplayName,
  LogTypeError,
  User,
  UserRole,
} from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  ErrorServiceModel,
  FacebookDataModel,
  GoogleDataModel,
  LanguageModel,
  SocialUserModel,
  UserServiceModel,
} from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import { LanguageService } from './language.service';

const serviceName = 'AuthService';

export class AuthService extends CommonService {
  private static _instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService._instance) {
      AuthService._instance = new AuthService();
    }
    return AuthService._instance;
  }

  constructor() {
    super();
  }

  async register(userData: any): Promise<string> {
    try {
      // Get Language
      let languageItem = await this.getLanguage(userData.language!);

      const data = await this.executeQueries<User>([
        this._prismaDb.user.create({
          data: {
            userId: uuidv4(),
            email: userData.email.toLocaleLowerCase().trim(),
            password: userData.password,
            nickname: userData.nickname.trim(),
            firstname: userData.firstname.trim(),
            lastname: userData.lastname.trim(),
            displayName: userData.displayName,
            languageIdFk: languageItem.id,
            loginType: userData.loginType,
            activated: false,
            disabled: false,
            securityQuestionUsers: {
              create: [
                {
                  securityQuestionsIdFk: userData.answers[0].id,
                  answer: userData.answers[0].answer,
                },
                {
                  securityQuestionsIdFk: userData.answers[1].id,
                  answer: userData.answers[1].answer,
                },
              ],
            },
          },
        }),
      ]);

      if (data == null || data[0] == null || data[0].userId == '') {
        return Promise.resolve('');
      }

      return Promise.resolve(data[0].userId);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'register', userData),
        error.message,
      );
      throw error;
    }
  }

  async registerSocialMedia(
    socialMediaUserData: SocialUserModel,
  ): Promise<UserServiceModel | null> {
    try {
      // Get Language
      let languageItem = await this.getLanguage(socialMediaUserData.language!);

      const userData = await this.executeQueries<User>([
        this._prismaDb.user.create({
          data: {
            userId: uuidv4(),
            socialUserId: socialMediaUserData.socialMediaUserId,
            email: socialMediaUserData.email!.trim(),
            nickname: socialMediaUserData.nickname!.trim(),
            firstname: socialMediaUserData.firstname?.trim() ?? '',
            lastname: socialMediaUserData.lastname?.trim() ?? '',
            displayName: DisplayName.Nickname,
            languageIdFk: languageItem.id,
            loginType: socialMediaUserData.loginType,
            role: UserRole.User,
            activated: true,
            disabled: false,
          },
        }),
      ]);

      if (userData == null || userData[0] == null || userData[0].userId == '') {
        return Promise.resolve(null);
      }

      const language = await LanguageService.getInstance().getById(
        userData[0].languageIdFk,
      );
      return Promise.resolve({
        userId: userData[0].userId,
        email: userData[0].email,
        password: '',
        firstname: userData[0].firstname!,
        lastname: userData[0].lastname!,
        nickname: userData[0].nickname,
        displayName: userData[0].displayName,
        role: userData[0].role,
        loginType: userData[0].loginType,
        language: {
          code: language?.code!,
        },
        photos: undefined
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(
          serviceName,
          'registerSocialMedia',
          socialMediaUserData,
        ),
        error.message,
      );
      throw error;
    }
  }

  private async getLanguage(code: string): Promise<LanguageModel> {
    let languageItem = await LanguageService.getInstance().getByCode(code);
    if (!languageItem) {
      languageItem = await LanguageService.getInstance().getByCode('en');
    }

    if (!languageItem) throw 'no language';

    return Promise.resolve(languageItem);
  }

  async cancelUserRegistration(userId: string): Promise<any> {
    try {
      const cancelledUser = await this.executeQueries<User>([
        this._prismaDb.user.delete({
          where: {
            userId: userId,
          },
        }),
      ]);

      if (
        cancelledUser == null ||
        cancelledUser[0] == null ||
        cancelledUser[0].userId == ''
      )
        throw { message: 'Prisma error' };

      return Promise.resolve(cancelledUser[0].userId);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'cancelUserRegistration', {
          userId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async loginSiteByEmail(email: string): Promise<UserServiceModel | undefined> {
    try {
      const userData = await this.executeQueries<User>([
        this._prismaDb.user.findFirst({
          where: {
            AND: {
              email: email.toLocaleLowerCase().trim(),
              loginType: 'Site',
              activated: true,
              disabled: false,
            },
          },
          select: {
            userId: true,
            password: true,
            firstname: true,
            lastname: true,
            nickname: true,
            displayName: true,
            role: true,
            loginType: true,
            languageIdFk: true,
          },
        }),
      ]);

      if (
        userData == null ||
        userData[0] == null ||
        userData[0].userId == '' ||
        userData[0].password == null ||
        userData[0].password == '' ||
        userData[0].nickname == ''
      ) {
        return Promise.resolve(undefined);
      }

      const language = await LanguageService.getInstance().getById(
        userData[0].languageIdFk,
      );

      return Promise.resolve({
        userId: userData[0].userId,
        email: userData[0].email,
        password: userData[0].password,
        firstname: userData[0].firstname!,
        lastname: userData[0].lastname!,
        nickname: userData[0].nickname,
        displayName: userData[0].displayName,
        role: userData[0].role,
        loginType: userData[0].loginType,
        language: {
          code: language?.code!,
        },
        photos: undefined
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'loginSiteByEmail', { email }),
        error.message,
      );
      throw error;
    }
  }

  async loginSiteByUserId(userId: string): Promise<UserServiceModel | undefined> {
    try {
      const userData = await this.executeQueries<User>([
        this._prismaDb.user.findFirst({
          where: {
            AND: {
              userId: userId,
              loginType: 'Site',
              activated: true,
              disabled: false,
            },
          },
          select: {
            email: true,
            password: true,
            firstname: true,
            lastname: true,
            nickname: true,
            displayName: true,
            role: true,
            loginType: true,
            languageIdFk: true,
          },
        }),
      ]);

      if (
        userData == null ||
        userData[0] == null ||
        userData[0].email == '' ||
        userData[0].password == null ||
        userData[0].password == '' ||
        userData[0].nickname == ''
      ) {
        return Promise.resolve(undefined);
      }

      const language = await LanguageService.getInstance().getById(
        userData[0].languageIdFk,
      );

      return Promise.resolve({
        userId: userId,
        email: '',
        password: userData[0].password,
        firstname: userData[0].firstname!,
        lastname: userData[0].lastname!,
        nickname: userData[0].nickname,
        displayName: userData[0].displayName,
        role: userData[0].role,
        loginType: userData[0].loginType,
        language: {
          code: language?.code!,
        },
        photos: undefined
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'loginSiteByUserId', { userId }),
        error.message,
      );
      throw error;
    }
  }

  async loginSocialMedia(
    loginType: AuthenticationMode,
    facebookData: FacebookDataModel | null,
    googleData: GoogleDataModel | null,
  ): Promise<SocialUserModel | null> {
    try {
      let userData: SocialUserModel | undefined;
      if (loginType == AuthenticationMode.Facebook) {
        userData = await this.loginByFacebook(facebookData!);
      } else if (loginType == AuthenticationMode.Google) {
        userData = await this.loginByGoogle(googleData!);
      }

      if (!userData) throw 'loginType or data incorrect';

      return Promise.resolve(userData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'loginSocialMedia', {
          loginType,
          googleData,
        }),
        error.message,
      );
      throw error;
    }
  }

  private async loginByFacebook(
    facebookData: FacebookDataModel,
  ): Promise<SocialUserModel> {
    try {
      const url = 'https://graph.facebook.com/me?';
      const access_token = `access_token=${facebookData.accessToken}`;
      const fields = 'fields=name,email,picture,first_name,last_name';

      const userInfos = await axios.get(`${url}${access_token}&${fields}`);
      if (!userInfos || !userInfos.data || userInfos.status > 250)
        throw `facebook user not found: ${userInfos?.statusText}`;

      return Promise.resolve({
        socialMediaUserId: userInfos.data.id,
        email: userInfos.data.email,
        firstname: userInfos.data.first_name,
        lastname: userInfos.data.last_name,
        nickname: !userInfos.data.email
          ? undefined
          : userInfos.data.email.split('@')[0],
        language: facebookData.language,
        loginType: AuthenticationMode.Facebook,
        dataLoginFromOther: {
          picture: userInfos.data.picture.data.url,
        },
      });
    } catch (error: any) {
      throw error;
    }
  }

  private async loginByGoogle(
    googleData: GoogleDataModel,
  ): Promise<SocialUserModel> {
    try {
      const googleAuth = new OAuth2Client({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      });

      // get exiration token
      const tokenInfo = await googleAuth.getTokenInfo(
        googleData.accessToken,
      );
      // console.log('expiry_date: ', tokenInfo.expiry_date);

      // Get user infos
      const loginTicket = await googleAuth.verifyIdToken({
        idToken: googleData.idToken,
      });
      // console.log(loginTicket.getPayload());
      // console.log(loginTicket.getUserId());

      const userId = loginTicket.getUserId();
      const userData = loginTicket.getPayload();

      if (!userId || !userData) throw 'google user not found';

      return Promise.resolve({
        socialMediaUserId: userId,
        email: userData.email,
        firstname: userData.given_name,
        lastname: userData.family_name,
        nickname: !userData.email ? undefined : userData.email.split('@')[0],
        language: userData.locale,
        loginType: AuthenticationMode.Google,
        dataLoginFromOther: {
          picture: userData.picture,
        },
      });
    } catch (error: any) {
      throw error;
    }
  }
}

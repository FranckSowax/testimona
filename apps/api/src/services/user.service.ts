import { LogTypeError, MediaObjectType, SecurityQuestion, SecurityQuestionUserAnswer, User } from '@prisma/client';
import {
  ErrorServiceModel,
  LanguageModel,
  UserIdentityModel,
  UserServiceModel,
} from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import * as _ from 'lodash';
import * as Constantes from '../helpers/constantes/_.constantes';
import { LanguageService } from './language.service';
import { RedisService } from './commons/redis.service';
import { MemorialAdminUserForRequestEmailModel } from '../models/services/memorial-user-relationship.model';
import { PhotoDatabaseService } from './photo.database.service';
import { PhotoUrlResponseModel } from '../models/responses/photo.model';
import { UpdateAnswerRequestModel, UpdateUserRequestModel } from '../models/requests/users.model';

const serviceName = 'UserService';

export class UserService extends CommonService {
  private static _instance: UserService;

  static getInstance(): UserService {
    if (!UserService._instance) {
      UserService._instance = new UserService();
    }
    return UserService._instance;
  }

  constructor() {
    super();
  }

  async activateAccount(userId: string): Promise<boolean> {
    try {
      const userUpdate = await this.executeQueries<User>([
        this._prismaDb.user.update({
          where: {
            userId: userId,
          },
          data: {
            activated: true,
          },
          select: {
            userId: true,
          },
        }),
      ]);

      return Promise.resolve(userUpdate[0].userId == userId);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'activateAccount', { userId }),
        error.message,
      );
      throw error;
    }
  }

  async emailAlreadyExists(email: string): Promise<boolean> {
    try {
      const count = await this.executeQueries<number>([
        this._prismaDb.user.count({
          where: {
            email: email.toLocaleLowerCase(),
          },
        }),
      ]);

      return Promise.resolve(count[0] == 1);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'emailAlreadyExists', { email }),
        error.message,
      );
      throw error;
    }
  }

  async accountToActivated(userId: string): Promise<boolean> {
    try {
      const count = await this.executeQueries<number>([
        this._prismaDb.user.count({
          where: {
            userId: userId,
          },
        }),
      ]);

      return Promise.resolve(count[0] == 1);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'accountActivated', {
          userId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async existsById(userId: string): Promise<boolean> {
    try {
      return this.getById(userId) != null;
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'existsById', { userId }),
        error.message,
      );
      throw error;
    }
  }

  async getIdentityDataForUserIds(userIds: string[]): Promise<UserIdentityModel[] | null> {
    try {
      const userIdsNotFound = new Array<string>();
      const usersFound = new Array<UserIdentityModel>();

      // get light user data from Redis
      for (const userId of userIds) {
        const data = await this.getFromRedisByUserId(userId);

        if (data) {
          usersFound.push(
            new UserIdentityModel(
              data.userId,
              data.firstname,
              data.lastname,
              data.nickname,
              data.displayName,
              data.photos
            ),
          );
        } else {
          userIdsNotFound.push(userId);
        }
      }

      if (usersFound.length == userIds.length) {
        return Promise.resolve(usersFound);
      }

      const userData = await this.executeQueries<User[]>([
        this._prismaDb.user.findMany({
          where: {
            AND: {
              userId: {
                in: userIdsNotFound,
              },
              activated: true,
              disabled: false,
            },
          },
          select: {
            userId: true,
            email: true,
            firstname: true,
            lastname: true,
            nickname: true,
            displayName: true,
            role: true,
            languageIdFk: true,
          },
        }),
      ]);

      if (!userData || userData[0].length == 0) {
        return Promise.resolve(usersFound);
      }

      // add to Redis
      for (const ite of userData[0]) {
        const userObject = await this.addToRedis(ite);
        usersFound.push(
          new UserIdentityModel(
            userObject.userId,
            userObject.firstname,
            userObject.lastname,
            userObject.nickname,
            userObject.displayName,
            userObject.photos
          ),
        );
      }

      // return value
      return Promise.resolve(usersFound);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getIdentityDataForUserIds', {
          userIds,
        }),
        error.message,
      );
      throw error;
    }
  }

  async getIdentityDataByUserId(
    userId: string,
  ): Promise<UserIdentityModel | null> {
    const userData = await this.getIdentityDataForUserIds(
      new Array<string>(userId),
    );
    return Promise.resolve(userData ? userData[0] : null);
  }

  async getByIds(userIds: string[]): Promise<MemorialAdminUserForRequestEmailModel[] | null> {
    try {
      const userIdsNotFound = new Array<string>();
      const usersFound = new Array<MemorialAdminUserForRequestEmailModel>();

      // get light user data from Redis
      for (const userId of userIds) {
        const data = await this.getFromRedisByUserId(userId);

        if (data) {
          usersFound.push(new MemorialAdminUserForRequestEmailModel(data.userId, data.email));
        } else {
          userIdsNotFound.push(userId);
        }
      }

      if (usersFound.length == userIds.length) {
        return Promise.resolve(usersFound);
      }

      const userData = await this.executeQueries<User[]>([
        this._prismaDb.user.findMany({
          where: {
            AND: {
              userId: {
                in: userIdsNotFound,
              },
              activated: true,
              disabled: false,
            },
          },
          select: {
            userId: true,
            email: true,
            firstname: true,
            lastname: true,
            nickname: true,
            displayName: true,
            role: true,
            languageIdFk: true,
          },
        }),
      ]);

      if (!userData || userData[0].length == 0) {
        return Promise.resolve(usersFound);
      }

      // add to Redis
      for (const ite of userData[0]) {
        const userObject = await this.addToRedis(ite);
        usersFound.push(new MemorialAdminUserForRequestEmailModel(userObject.userId, userObject.email));
      }

      // return value
      return Promise.resolve(usersFound);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getEmailByIds', {
          userIds,
        }),
        error.message,
      );
      throw error;
    }
  }

  async getById(userId: string): Promise<UserServiceModel | null> {
    try {
      const userData = await this.executeQueries<User>([
        this._prismaDb.user.findFirst({
          where: {
            userId: userId,
            activated: true,
            disabled: false,
          },
          select: {
            userId: true,
            email: true,
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

      if (!userData || !userData[0]) {
        return Promise.resolve(null);
      }

      const language = await LanguageService.getInstance().getById(
        userData[0].languageIdFk,
      );
      const photoData = await this.getPhotos(userData[0].userId);

      return Promise.resolve(
        new UserServiceModel(
          userData[0].userId,
          userData[0].email,
          '',
          userData[0].firstname ?? '',
          userData[0].lastname ?? '',
          userData[0].nickname,
          userData[0].displayName,
          userData[0].role,
          userData[0].loginType,
          { code: language ? language.code : '' },
          photoData
        ),
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getById', { userId }),
        error.message,
      );
      throw error;
    }
  }

  async getByEmail(email: string): Promise<UserServiceModel | null> {
    try {
      const userData = await this.executeQueries<User>([
        this._prismaDb.user.findFirst({
          where: {
            email: email.toLocaleLowerCase().trim(),
            activated: true,
            disabled: false,
          },
          select: {
            userId: true,
            email: true,
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

      if (!userData || !userData[0]) {
        return Promise.resolve(null);
      }

      const language = await LanguageService.getInstance().getById(
        userData[0].languageIdFk,
      );
      const photoData = await this.getPhotos(userData[0].userId);

      return Promise.resolve(
        new UserServiceModel(
          userData[0].userId,
          userData[0].email,
          '',
          userData[0].firstname ?? '',
          userData[0].lastname ?? '',
          userData[0].nickname,
          userData[0].displayName,
          userData[0].role,
          userData[0].loginType,
          { code: language ? language.code : '' },
          photoData
        ),
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getByEmail', { email }),
        error.message,
      );
      throw error;
    }
  }

  async getBySocialUserId(socialUserId: string): Promise<UserServiceModel | null> {
    try {
      const userData = await this.executeQueries<User>([
        this._prismaDb.user.findUnique({
          where: {
            socialUserId: socialUserId,
          },
          select: {
            userId: true,
            email: true,
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

      if (!userData || !userData[0]) {
        return Promise.resolve(null);
      }

      const language = await LanguageService.getInstance().getById(
        userData[0].languageIdFk,
      );

      const photoData = await this.getPhotos(userData[0].userId);

      return Promise.resolve(
        new UserServiceModel(
          userData[0].userId,
          userData[0].email,
          '',
          userData[0].firstname ?? '',
          userData[0].lastname ?? '',
          userData[0].nickname,
          userData[0].displayName,
          userData[0].role,
          userData[0].loginType,
          { code: language ? language.code : '' },
          photoData
        ),
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getBySocialUserId', {
          socialUserId,
        }),
        error.message,
      );
      throw error;
    }
  }

  private async addToRedis(userDb: User): Promise<UserServiceModel> {
    const language = await LanguageService.getInstance().getById(
      userDb.languageIdFk,
    );

    const photoData = await this.getPhotos(userDb.userId);

    // Mappage for Redis
    const returnData = new UserServiceModel(
      userDb.userId,
      userDb.email,
      '',
      userDb.firstname ?? '',
      userDb.lastname ?? '',
      userDb.nickname,
      userDb.displayName,
      userDb.role,
      userDb.loginType,
      { code: language ? language.code : '' },
      photoData
    );

    // add to Redis by userId
    await RedisService.getInstance().setObject(
      [Constantes.PrefixUserIdKey, returnData.userId],
      returnData,
    );

    // add to Redis by email
    await RedisService.getInstance().setObject(
      [Constantes.PrefixUserEmailKey, returnData.email],
      returnData,
    );

    // set expiration for Redis
    await RedisService.getInstance().addExpiration(
      [Constantes.PrefixUserIdKey, returnData.userId],
      Constantes.UserExpiration,
    );

    await RedisService.getInstance().addExpiration(
      [Constantes.PrefixUserEmailKey, returnData.email],
      Constantes.UserExpiration,
    );

    return Promise.resolve(returnData);
  }

  private async getFromRedisByUserId(
    userId: string,
  ): Promise<UserServiceModel | null> {
    const data = await RedisService.getInstance().getObject([
      Constantes.PrefixUserIdKey,
      userId,
    ]);
    if (data != null) return Promise.resolve(<UserServiceModel>data);

    return Promise.resolve(null);
  }

  private async getPhotos(userId: string): Promise<Array<PhotoUrlResponseModel> | undefined> {
    try {
      const photoData = await PhotoDatabaseService.getInstance().getPhotoDataForObjectIds(MediaObjectType.UserProfile, [userId]);
      return photoData;
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getPhotos', { userId }),
        error.message,
      );
      throw error;
    }
  }

  public async updatePassword(userId: string, hashedPassword: string): Promise<boolean> {
    try {
      await this.executeQueries<User>([
        this._prismaDb.user.update({
          where: { userId },
          data: { password: hashedPassword, lastUpdatedAt: new Date() },
        }),
      ]);
      return true;
    } catch (error: any) {
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'updatePassword', { userId }),
        error.message,
      );
      throw error;
    }
  }

  public async update(currentUserId: string, userData: UpdateUserRequestModel): Promise<boolean> {
    try {
      const language = await this.getLanguage(userData.language);

      await this.executeQueries<User>([
        this._prismaDb.user.update({
          where: {
            userId: currentUserId
          },
          data: {
            firstname: userData.firstname.trim(),
            lastname: userData.lastname.trim(),
            nickname: userData.nickname.trim(),
            languageIdFk: language.id,
            lastUpdatedAt: new Date()
          },
        }),
      ]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'update', { currentUserId, userData }),
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

  public async updateAnswer(currentUserId: string, updateAnswersData: UpdateAnswerRequestModel): Promise<boolean> {
    try {
      await this.deleteAnswer(currentUserId, updateAnswersData.previousQuestionId);

      await this.executeQueries<SecurityQuestionUserAnswer>([
        this._prismaDb.securityQuestionUserAnswer.create({
          data: {
            userIdFk: currentUserId,
            securityQuestionsIdFk: updateAnswersData.id,
            answer: updateAnswersData.answer
          },
        }),
      ]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'updateAnswer', { currentUserId, updateAnswersData }),
        error.message,
      );
      throw error;
    }
  }

  private async deleteAnswer(currentUserId: string, securityQuestionsId: number): Promise<boolean> {
    try {
      await this.executeQueries<SecurityQuestionUserAnswer>([
        this._prismaDb.securityQuestionUserAnswer.delete({
          where: {
            securityQuestionsIdFk_userIdFk: {
              userIdFk: currentUserId,
              securityQuestionsIdFk: securityQuestionsId
            }
          }
        })
      ]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'deleteAnswer', { currentUserId, securityQuestionsId }),
        error.message,
      );
      throw error;
    }
  }
}

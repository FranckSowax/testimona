import { LogTypeError, MemorialUserRelationship, Relative } from '@prisma/client';
import {
  ErrorServiceModel,
  MemorialUserRelationshipModel,
  MemorialAdminUserRelationshipModel,
  UserIdentityModel,
} from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import * as _ from 'lodash';
import { UserHelpers } from '../helpers/_.helpers';
import { UserService } from './user.service';
import { MemorialAdminUserForRequestEmailModel } from '../models/services/memorial-user-relationship.model';

const serviceName = 'MemorialUserRelationshipService';

export class MemorialUserRelationshipService extends CommonService {
  private static _instance: MemorialUserRelationshipService;

  static getInstance(): MemorialUserRelationshipService {
    if (!MemorialUserRelationshipService._instance) {
      MemorialUserRelationshipService._instance = new MemorialUserRelationshipService();
    }
    return MemorialUserRelationshipService._instance;
  }

  constructor() {
    super();
  }

  async addMemorialRelationship(userId: string, memorialId: number, relative: Relative, isAdmin: boolean): Promise<boolean> {
    try {
      const relationshipExists = await this.getMemorialRelationshipForCurrentUser(memorialId, userId);
      if (relationshipExists.userId != "") {
        return Promise.resolve(true);
      }

      const relationshipCreated = await this.executeQueries<MemorialUserRelationship>([
        this._prismaDb.memorialUserRelationship.create({
          data: {
            memorialIdFk: memorialId,
            userIdFk: userId,
            relationship: relative,
            isAdmin: isAdmin
          },
        }),
      ]);

      return Promise.resolve(relationshipCreated != null && relationshipCreated.length == 1);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'addMemorialRelationship', { memorialId, userId, relative }),
        error.message,
      );
      throw error;
    }
  }

  async getMemorialRelationshipForCurrentUser(memorialId: number, userId: string): Promise<MemorialUserRelationshipModel> {
    try {
      if (memorialId == 0 || userId == '') {
        return Promise.resolve(new MemorialUserRelationshipModel(0, '', Relative.Undefined, false));
      }

      const data = await this.executeQueries<MemorialUserRelationship>([
        this._prismaDb.memorialUserRelationship.findUnique({
          where: {
            memorialIdFk_userIdFk: {
              memorialIdFk: memorialId,
              userIdFk: userId
            }
          },
          select: {
            relationship: true,
            isAdmin: true
          }
        }),
      ]);

      if (!data || !data[0]) {
        return Promise.resolve(new MemorialUserRelationshipModel(0, '', Relative.Undefined, false));
      }

      return Promise.resolve(new MemorialUserRelationshipModel(memorialId, userId, data[0].relationship, data[0].isAdmin));
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getMemorialRelationshipForCurrentUser', { memorialId, userId }),
        error.message,
      );
      throw error;
    }
  }

  async getRelationshipDataForUserIds(memorialId: number, userIds: string[]): Promise<MemorialUserRelationshipModel[] | null> {
    try {
      const data = await this.executeQueries<MemorialUserRelationship[]>([
        this._prismaDb.memorialUserRelationship.findMany({
          where: {
            AND: {
              userIdFk: {
                in: userIds,
              },
              memorialIdFk: memorialId
            },
          },
          select: {
            memorialIdFk: true,
            userIdFk: true,
            relationship: true,
            isAdmin: true
          }
        }),
      ]);

      if (!data || !data[0]) {
        return Promise.resolve(null);
      }

      return Promise.resolve(_.map<MemorialUserRelationship, MemorialUserRelationshipModel>(
        data[0],
        (item: MemorialUserRelationship) => {
          return new MemorialUserRelationshipModel(item.memorialIdFk, item.userIdFk, item.relationship, item.isAdmin);
        },
      ));
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getRelationshipDataForUserIds', {
          userIds,
        }),
        error.message,
      );
      throw error;
    }
  }

  async getMemorialAdminUsers(memorialId: number): Promise<MemorialAdminUserRelationshipModel[] | null> {
    try {
      if (memorialId == 0) {
        return Promise.resolve(null);
      }

      const data = await this.executeQueries<MemorialUserRelationship[]>([
        this._prismaDb.memorialUserRelationship.findMany({
          where: {
            memorialIdFk: memorialId,
          },
          select: {
            userIdFk: true,
            relationship: true,
            isAdmin: true,
          }
        }),
      ]);

      if (!data || !data[0]) {
        return Promise.resolve(null);
      }

      const userIds = _.map(data[0], (ite) => { return ite.userIdFk; });
      const userData = await UserService.getInstance().getIdentityDataForUserIds(userIds);

      const returnData = _.map<MemorialUserRelationship, MemorialAdminUserRelationshipModel>(
        data[0],
        (item: MemorialUserRelationship) => {
          let userInfos: UserIdentityModel | undefined = undefined;
          if (userData) {
            userInfos = _.find(userData, ((u) => { return u.userId == item.userIdFk; }));
          }
          let identityData = UserHelpers.getStringNameToDisplay(userInfos);
          
          return new MemorialAdminUserRelationshipModel(item.memorialIdFk, identityData, item.relationship, item.isAdmin);
        },
      );

      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getMemorialAdminUsers', { memorialId }),
        error.message,
      );
      throw error;
    }
  }

  async getMemorialAdminUsersForRequestEmail(memorialId: number): Promise<MemorialAdminUserForRequestEmailModel[] | null> {
    try {
      if (memorialId == 0) {
        return Promise.resolve(null);
      }

      const data = await this.executeQueries<MemorialUserRelationship[]>([
        this._prismaDb.memorialUserRelationship.findMany({
          where: {
            memorialIdFk: memorialId,
          },
          select: {
            userIdFk: true,
            isAdmin: true,
          }
        }),
      ]);

      if (!data || !data[0]) {
        return Promise.resolve(null);
      }

      const userIds = _.map(data[0], (ite) => { return ite.userIdFk; });
      const userData = await UserService.getInstance().getByIds(userIds);

      const returnData = _.map<MemorialUserRelationship, MemorialAdminUserForRequestEmailModel>(
        data[0],
        (item: MemorialUserRelationship) => {
          if (userData) {
            const userFound = _.find(userData, ((u) => { return u.userId == item.userIdFk; }));
            return userFound ? userFound : new MemorialAdminUserForRequestEmailModel('', '');
          }

          return new MemorialAdminUserForRequestEmailModel('', '');
        },
      );

      return Promise.resolve(_.filter(returnData, (ite) => ite.userId != ''));
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getMemorialAdminUsers', { memorialId }),
        error.message,
      );
      throw error;
    }
  }
}

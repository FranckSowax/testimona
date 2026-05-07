import { likeItem, LogTypeError, MediaObjectType } from "@prisma/client";
import * as _ from 'lodash';
import { UserLikedItem } from "../models/services/user-liked-item.model";
import { ErrorServiceModel } from "../models/_.models";
import { CommonService } from "./commons/common.service";
import { LogService } from "./commons/log.service";

const serviceName = 'UserLikedItemService';

export class UserLikedItemService extends CommonService {
  private static _instance: UserLikedItemService;

  static getInstance(): UserLikedItemService {
    if (!UserLikedItemService._instance) {
        UserLikedItemService._instance = new UserLikedItemService();
    }
    return UserLikedItemService._instance;
  }

  constructor() {
    super();
  }

  async userLikesItem(userId: string, itemId: string, itemType: MediaObjectType): Promise<boolean> {
    try {
        const userLikesItem = await this.executeQueries<number>([
          this._prismaDb.likeItem.count({
            where: {
              userId: userId,
              itemId: itemId,
              objectType: itemType
            }
          }),
        ]);

        return Promise.resolve(userLikesItem[0] == 1);
      } catch (error: any) {
        console.log(error);
        LogService.getInstance().create(
          LogTypeError.Error,
          new ErrorServiceModel(serviceName, 'userLikesItem', { userId, itemId, itemType }),
          error.message,
        );
        throw error;
      }
  }

  async getAllLikedForUserIdAndObjectType(userId: string, itemType: MediaObjectType): Promise<UserLikedItem[]> {
    try {
        const likedItemData = await this.executeQueries<likeItem[]>([
          this._prismaDb.likeItem.findMany({
            where: {
              userId: userId,
              objectType: itemType
            },
            select: {
                itemId: true
            }
          }),
        ]);

        if (likedItemData == null || likedItemData.length == 0)
            return Promise.resolve([]);
  
        return Promise.resolve(_.map<likeItem, UserLikedItem>(likedItemData[0], (ite: likeItem) => {
            return { 
                userId: userId,
                itemId: ite.itemId,
                itemType: itemType
            };
        }));
      } catch (error: any) {
        console.log(error);
        LogService.getInstance().create(
          LogTypeError.Error,
          new ErrorServiceModel(serviceName, 'getAllLikedForUserIdAndObjectType', { userId, itemType }),
          error.message,
        );
        throw error;
      }
  }

  async like(userId: string, itemId: string, itemType: MediaObjectType): Promise<boolean> {
    try {
        const addLikedItemLine = await this.executeQueries<likeItem>([
          this._prismaDb.likeItem.create({
            data: {
              userId: userId,
              itemId: itemId,
              objectType: itemType
            },
          }),
        ]);
  
        return Promise.resolve(addLikedItemLine.length > 0);
      } catch (error: any) {
        console.log(error);
        LogService.getInstance().create(
          LogTypeError.Error,
          new ErrorServiceModel(serviceName, 'like', { userId, itemId, itemType }),
          error.message,
        );
        throw error;
      }
  }

  async unlike(userId: string, itemId: string, itemType: MediaObjectType): Promise<boolean> {
    try {
        const removeLikedItemLine = await this.executeQueries<likeItem>([
          this._prismaDb.likeItem.delete({
            where: {
                userId_itemId_objectType: {
                    userId: userId,
                    itemId: itemId,
                    objectType: itemType
                }
            },
          }),
        ]);
  
        return Promise.resolve(removeLikedItemLine.length > 0);
      } catch (error: any) {
        console.log(error);
        LogService.getInstance().create(
          LogTypeError.Error,
          new ErrorServiceModel(serviceName, 'unlike', { userId, itemId, itemType }),
          error.message,
        );
        throw error;
      }
  }
}
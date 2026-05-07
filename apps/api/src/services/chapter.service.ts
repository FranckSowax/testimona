import { Chapter, LogTypeError, MediaObjectType } from '@prisma/client';
import {
  ErrorServiceModel,
  ChapterCreateByMemorialIdModel,
  ChapterModel,
  UserIdentityModel,
} from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import * as _ from 'lodash';
import { IncludeDataExistsEnum } from '../enums/_.enums';
import { UserService } from './user.service';
import { UserHelpers } from '../helpers/_.helpers';
import { PhotoUrlResponseModel } from '../models/responses/photo.model';
import { PhotoDatabaseService } from './photo.database.service';

const serviceName = 'ChapterService';

export class ChapterService extends CommonService {
  private static _instance: ChapterService;

  static getInstance(): ChapterService {
    if (!ChapterService._instance) {
      ChapterService._instance = new ChapterService();
    }
    return ChapterService._instance;
  }

  constructor() {
    super();
  }

  async createByMemorialId(
    currentUserId: string,
    memorialId: number,
    chapterData: any,
  ): Promise<ChapterCreateByMemorialIdModel> {
    try {
        const chapterCreated = await this.executeQueries<Chapter>([
            this._prismaDb.chapter.create({
              data: {
                memorialIdFk: memorialId,
                title: chapterData.title.trim(),
                content: chapterData.content.trim(),
                createByIdFk: currentUserId,
                updateByIdFk: currentUserId,
                disabled: false,
              },
            }),
          ]);

        return Promise.resolve({
            id: chapterCreated[0].chapterId,
            createDate: chapterCreated[0].createAt
        })
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'createByMemorialId', { memorialId, chapterData, currentUserId }),
        error.message,
      );
      throw error;
    }
  }

  async getByMemorialId(memorialId: number, includeData: IncludeDataExistsEnum): Promise<ChapterModel[]> {
    try {
      let whereCondition: any = { memorialIdFk: memorialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const chapterData = await this.executeQueries<Chapter[]>([
        this._prismaDb.chapter.findMany({
          where: whereCondition,
          select: {
            chapterId: true,
            memorialIdFk: true,
            title: true,
            content: true,
            createByIdFk: true,
            createAt: true,
            updateAt: true,
          }
        }),
      ]);

      if (chapterData == null || chapterData.length == 0)
        return Promise.resolve([]);

      const userIds = _.map(chapterData[0], (ite) => { return ite.createByIdFk; });
      const userData = await UserService.getInstance().getIdentityDataForUserIds(userIds);

      const chapterIds = _.map(chapterData[0], (ite) => { return ite.chapterId.toString(); });
      const photoData = await PhotoDatabaseService.getInstance().getPhotoDataForObjectIds(MediaObjectType.Chapter, chapterIds);

      const returnData = _.map<Chapter, ChapterModel>(
        chapterData[0],
        (item: Chapter) => {
          let userInfos: UserIdentityModel | undefined = undefined;
          if (userData) {
            userInfos = _.find(userData, ((u) => { return u.userId == item.createByIdFk; }));
          }

          let photoInfos: PhotoUrlResponseModel[] | null = null;
          if (photoData) {
            photoInfos = _.filter(photoData, ((p) => { return p.objectId == item.chapterId.toString(); }));
          }

          return new ChapterModel(
            item.chapterId,
            item.memorialIdFk,
            item.title,
            item.content,
            photoInfos ?? [],
            item.createAt,
            item.updateAt,
            {
              userId: userInfos?.userId!,
              identity: UserHelpers.getStringNameToDisplay(userInfos),
            }
          );
        },
      );

      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getByMemorialId', { memorialId }),
        error.message,
      );
      throw error;
    }
  }

  async existsById(includeData: IncludeDataExistsEnum, chapterId: number): Promise<boolean> {
    try {
      let whereCondition: any = { chapterId: chapterId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const count = await this.executeQueries<number>([
        this._prismaDb.chapter.count({
          where: whereCondition,
        }),
      ]);

      return Promise.resolve(count[0] == 1);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'existsById', {
          includeData,
          chapterId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async getById(includeData: IncludeDataExistsEnum, chapterId: number): Promise<ChapterModel | null> {
    try {
      let whereCondition: any = { chapterId: chapterId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const chapterData = await this.executeQueries<Chapter>([
        this._prismaDb.chapter.findFirst({
          where: whereCondition,
          select: {
            chapterId: true,
            title: true,
            content: true,
            createByIdFk: true,
            createAt: true,
            updateAt: true,
          }
        }),
      ]);

      if (!chapterData || !chapterData[0])
        return Promise.resolve(null);

      const photos = await PhotoDatabaseService.getInstance().getPhotoDataForObjectIds(MediaObjectType.Chapter, [chapterData[0].chapterId.toString()]);
      const userData = await UserService.getInstance().getIdentityDataByUserId(chapterData[0].createByIdFk);

      return Promise.resolve(
        new ChapterModel(
          chapterData[0].chapterId,
          0,
          chapterData[0].title,
          chapterData[0].content,
          photos ?? [],
          chapterData[0].createAt,
          chapterData[0].updateAt,
          {
            userId: userData?.userId!,
            identity: UserHelpers.getStringNameToDisplay(userData || undefined),
          }
        )
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'existsById', {
          includeData,
          chapterId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async update(
    currentUserId: string,
    chapterId: number,
    chapterData: any
  ): Promise<boolean> {
    try {
      const chapterUpdated = await this.executeQueries<Chapter>([
        this._prismaDb.chapter.update({
          where: {
            chapterId: chapterId,
          },
          data: {
            title: chapterData.title.trim(),
            content: chapterData.content.trim(),
            updateByIdFk: currentUserId,
            updateAt: new Date(),
            disabled: false
          },
        }),
      ]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'update', { currentUserId, chapterId, chapterData }),
        error.message,
      );
      throw error;
    }
  }

  async delete(currentUserId: string, chapterId: number): Promise<number> {
    try {
      const chapterDeleted = await this.executeQueries<Chapter>([
        this._prismaDb.chapter.update({
          data: {
            disabled: true,
            updateByIdFk: currentUserId,
          },
          where: {
            chapterId: chapterId
          },
          select: {
            chapterId: true,
          },
        }),
      ]);

      return Promise.resolve(chapterDeleted[0].chapterId);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'delete', { currentUserId, chapterId: chapterId }),
        error.message,
      );
      throw error;
    }
  }
}

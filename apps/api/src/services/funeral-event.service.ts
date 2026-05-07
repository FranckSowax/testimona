import { FuneralEvent, LogTypeError } from '@prisma/client';
import {
  ErrorServiceModel,
  FuneralEventCreateByMemorialIdModel,
  FuneralEventModel,
  UserIdentityModel,
} from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import * as _ from 'lodash';
import { IncludeDataExistsEnum } from '../enums/_.enums';
import { UserService } from './user.service';
import { UserHelpers } from '../helpers/_.helpers';

const serviceName = 'FuneralEventService';

export class FuneralEventService extends CommonService {
  private static _instance: FuneralEventService;

  static getInstance(): FuneralEventService {
    if (!FuneralEventService._instance) {
      FuneralEventService._instance = new FuneralEventService();
    }
    return FuneralEventService._instance;
  }

  constructor() {
    super();
  }

  async createByMemorialId(
    currentUserId: string,
    memorialId: number,
    funeralEventData: any,
  ): Promise<FuneralEventCreateByMemorialIdModel> {
    try {
        const funeralEventCreated = await this.executeQueries<FuneralEvent>([
            this._prismaDb.funeralEvent.create({
              data: {
                memorialIdFk: memorialId,
                title: funeralEventData.title.trim(),
                date: funeralEventData.date,
                startHour: funeralEventData.startHour,
                startHourPeriod: funeralEventData.startPeriod,
                endHour: funeralEventData.endHour,
                endHourPeriod: funeralEventData.endPeriod,
                url: this.formatUrl(funeralEventData.url?.trim()),
                note: funeralEventData.note?.trim(),
                location: funeralEventData.location?.trim(),
                createByIdFk: currentUserId,
                updateByIdFk: currentUserId,
                disabled: false,
              },
            }),
          ]);

        return Promise.resolve({
            id: funeralEventCreated[0].funeralEventId,
            createDate: funeralEventCreated[0].createAt
        })
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'createByMemorialId', { memorialId, funeralEventData, currentUserId }),
        error.message,
      );
      throw error;
    }
  }

  private formatUrl(url: string): string {
    if (url == '' || url == undefined || url == null) return '';

    if (url.toLowerCase().startsWith('https://') || url.toLowerCase().startsWith('http://')) return url;

    return `http://${url}`;
  }

  async getByMemorialId(memorialId: number, includeData: IncludeDataExistsEnum): Promise<FuneralEventModel[]> {
    try {
      let whereCondition: any = { memorialIdFk: memorialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const funeralEventData = await this.executeQueries<FuneralEvent[]>([
        this._prismaDb.funeralEvent.findMany({
          where: whereCondition,
          orderBy: [
            {
              date: 'asc',
            },
            {
              startHourPeriod: 'asc',
            },
            {
              startHour: 'asc',
            },
          ],
          select: {
            funeralEventId: true,
            memorialIdFk: true,
            title: true,
            date: true,
            startHour: true,
            startHourPeriod: true,
            endHour: true,
            endHourPeriod: true,
            url: true,
            note: true,
            location: true,
            createByIdFk: true,
            createAt: true,
            updateAt: true,
          }
        }),
      ]);

      if (funeralEventData == null || funeralEventData.length == 0)
        return Promise.resolve([]);

        const userIds = _.map(funeralEventData[0], (ite) => { return ite.createByIdFk; });
        const userData = await UserService.getInstance().getIdentityDataForUserIds(userIds);
  
        const returnData = _.map<FuneralEvent, FuneralEventModel>(
          funeralEventData[0],
          (item: FuneralEvent) => {
            let userInfos: UserIdentityModel | undefined = undefined;
            if (userData) {
              userInfos = _.find(userData, ((u) => { return u.userId == item.createByIdFk; }));
            }
  
            return new FuneralEventModel(
              item.funeralEventId,
              item.memorialIdFk,
              item.title,
              item.date,
              item.startHour,
              item.startHourPeriod,
              item.endHour,
              item.endHourPeriod,
              item.url ?? '',
              item.note ?? '',
              item.location ?? '',
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

  async existsById(includeData: IncludeDataExistsEnum, funeralEventId: number): Promise<boolean> {
    try {
      let whereCondition: any = { funeralEventId: funeralEventId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const count = await this.executeQueries<number>([
        this._prismaDb.funeralEvent.count({
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
          funeralEventId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async getById(includeData: IncludeDataExistsEnum, funeralEventId: number): Promise<FuneralEventModel | null> {
    try {
      let whereCondition: any = { funeralEventId: funeralEventId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const funeralEventData = await this.executeQueries<FuneralEvent>([
        this._prismaDb.funeralEvent.findFirst({
          where: whereCondition,
          select: {
            funeralEventId: true,
            title: true,
            date: true,
            startHour: true,
            startHourPeriod: true,
            endHour: true,
            endHourPeriod: true,
            url: true,
            note: true,
            location: true,
            createAt: true,
            createByIdFk: true,
            updateAt: true,
          }
        }),
      ]);

      if (!funeralEventData || !funeralEventData[0])
        return Promise.resolve(null);

      const userInfos = await UserService.getInstance().getIdentityDataByUserId(funeralEventData[0].createByIdFk);
      return Promise.resolve(
        new FuneralEventModel(
          funeralEventData[0].funeralEventId,
          0,
          funeralEventData[0].title,
          funeralEventData[0].date,
          funeralEventData[0].startHour,
          funeralEventData[0].startHourPeriod,
          funeralEventData[0].endHour,
          funeralEventData[0].endHourPeriod,
          funeralEventData[0].url ?? '',
          funeralEventData[0].note ?? '',
          funeralEventData[0].location ?? '',
          funeralEventData[0].createAt,
          funeralEventData[0].updateAt,
          {
            userId: userInfos?.userId!,
            identity: UserHelpers.getStringNameToDisplay(userInfos ?? undefined),
          }
        )
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'existsById', {
          includeData,
          funeralEventId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async update(
    currentUserId: string,
    funeralEventId: number,
    funeralEventData: any
  ): Promise<boolean> {
    try {
      console.log(funeralEventData)

      const funeralEventUpdated = await this.executeQueries<FuneralEvent>([
        this._prismaDb.funeralEvent.update({
          where: {
            funeralEventId: funeralEventId,
          },
          data: {
            title: funeralEventData.title.trim(),
            date: funeralEventData.date,
            startHour: funeralEventData.startHour,
            startHourPeriod: funeralEventData.startPeriod,
            endHour: funeralEventData.endHour,
            endHourPeriod: funeralEventData.endPeriod,
            url: this.formatUrl(funeralEventData.url?.trim()),
            note: funeralEventData.note?.trim(),
            location: funeralEventData.location?.trim(),
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
        new ErrorServiceModel(serviceName, 'update', { currentUserId, funeralEventId, funeralEventData }),
        error.message,
      );
      throw error;
    }
  }

  async delete(currentUserId: string, funeralEventId: number): Promise<number> {
    try {
      const funeralEventDeleted = await this.executeQueries<FuneralEvent>([
        this._prismaDb.funeralEvent.update({
          data: {
            disabled: true,
            updateByIdFk: currentUserId,
          },
          where: {
            funeralEventId: funeralEventId
          },
          select: {
            funeralEventId: true,
          },
        }),
      ]);

      return Promise.resolve(funeralEventDeleted[0].funeralEventId);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'delete', { currentUserId, funeralEventId: funeralEventId }),
        error.message,
      );
      throw error;
    }
  }
}

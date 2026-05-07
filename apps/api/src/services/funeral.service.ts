import { Funeral, LogTypeError } from '@prisma/client';
import {
  ErrorServiceModel,
  FuneralCreateByMemorialIdModel,
  FuneralModel
} from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import * as _ from 'lodash';
import { IncludeDataExistsEnum } from '../enums/_.enums';
import { UserService } from './user.service';
import { UserHelpers } from '../helpers/_.helpers';

const serviceName = 'FuneralService';

export class FuneralService extends CommonService {
  private static _instance: FuneralService;

  static getInstance(): FuneralService {
    if (!FuneralService._instance) {
      FuneralService._instance = new FuneralService();
    }
    return FuneralService._instance;
  }

  constructor() {
    super();
  }

  async createByMemorialId(
    currentUserId: string,
    memorialId: number,
    funeralData: any,
  ): Promise<FuneralCreateByMemorialIdModel> {
    try {
        const funeralCreated = await this.executeQueries<Funeral>([
            this._prismaDb.funeral.create({
              data: {
                content: funeralData.content.trim(),
                createByIdFk: currentUserId,
                updateByIdFk: currentUserId,
                disabled: false,
                memorialIdFk: memorialId
              },
            }),
          ]);

        return Promise.resolve({
            id: funeralCreated[0].funeralId,
            createDate: funeralCreated[0].createAt
        })
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'createByMemorialId', { memorialId, funeralData, currentUserId }),
        error.message,
      );
      throw error;
    }
  }

  async existsById(includeData: IncludeDataExistsEnum, memorialId: number): Promise<boolean> {
    try {
      let whereCondition: any = { memorialIdFk: memorialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const count = await this.executeQueries<number>([
        this._prismaDb.funeral.count({
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
          memorialId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async getByMemorialId(memorialId: number, includeData: IncludeDataExistsEnum): Promise<FuneralModel | null> {
    try {
      let whereCondition: any = { memorialIdFk: memorialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const funeralData = await this.executeQueries<Funeral>([
        this._prismaDb.funeral.findFirst({
          where: whereCondition,
          select: {
            funeralId: true,
            memorialIdFk: true,
            content: true,
            createByIdFk: true,
            createAt: true,
            updateAt: true,
          }
        }),
      ]);

      if (!funeralData || !funeralData[0])
        return Promise.resolve(null);

      const userInfos = await UserService.getInstance().getIdentityDataByUserId(funeralData[0].createByIdFk);

      return Promise.resolve(new FuneralModel(
        funeralData[0].funeralId,
        funeralData[0].memorialIdFk,
        funeralData[0].content,
        funeralData[0].createAt,
        funeralData[0].updateAt,
        {
          userId: userInfos?.userId!,
          identity: UserHelpers.getStringNameToDisplay(userInfos ?? undefined),
        })
      );
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

  async update(
    currentUserId: string,
    memorialId: number,
    funeralData: any
  ): Promise<boolean> {
    try {
      const funeralUpdated = await this.executeQueries<Funeral>([
        this._prismaDb.funeral.update({
          where: {
            memorialIdFk: memorialId,
          },
          data: {
            content: funeralData.content.trim(),
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
        new ErrorServiceModel(serviceName, 'update', { currentUserId, memorialId, funeralData }),
        error.message,
      );
      throw error;
    }
  }
}

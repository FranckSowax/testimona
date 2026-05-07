import { Biography, LogTypeError } from '@prisma/client';
import { BiographyModel, ErrorServiceModel } from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import * as _ from 'lodash';
import { IncludeDataExistsEnum } from '../enums/_.enums';
import { BiographyCreateByMemorialIdModel } from '../models/services/biography.model';

const serviceName = 'BiographyService';

export class BiographyService extends CommonService {
  private static _instance: BiographyService;

  static getInstance(): BiographyService {
    if (!BiographyService._instance) {
      BiographyService._instance = new BiographyService();
    }
    return BiographyService._instance;
  }

  constructor() {
    super();
  }

  async createByMemorialId(
    currentUserId: string,
    memorialId: number,
    biographyData: any,
  ): Promise<BiographyCreateByMemorialIdModel> {
    try {
      const funeralCreated = await this.executeQueries<Biography>([
        this._prismaDb.biography.create({
          data: {
            nicknames: biographyData.nicknames?.trim() ?? '',
            homeCity: biographyData.homeCity?.trim() ?? '',
            placesLived: biographyData.placesLived?.trim() ?? '',
            religion: biographyData.religion?.trim() ?? '',
            education: biographyData.education?.trim() ?? '',
            work: biographyData.work?.trim() ?? '',
            hobbies: biographyData.hobbies?.trim() ?? '',
            createByIdFk: currentUserId,
            updateByIdFk: currentUserId,
            disabled: false,
            memorialIdFk: memorialId,
          },
        }),
      ]);

      return Promise.resolve({
        id: funeralCreated[0].biographyId,
        createDate: funeralCreated[0].createAt,
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'createByMemorialId', {
          memorialId,
          biographyData,
          currentUserId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async existsById(
    includeData: IncludeDataExistsEnum,
    memorialId: number,
  ): Promise<boolean> {
    try {
      let whereCondition: any = { memorialIdFk: memorialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const count = await this.executeQueries<number>([
        this._prismaDb.biography.count({
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

  async getByMemorialId(
    memorialId: number,
    includeData: IncludeDataExistsEnum,
  ): Promise<BiographyModel | null> {
    try {
      let whereCondition: any = { memorialIdFk: memorialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const biographyData = await this.executeQueries<Biography>([
        this._prismaDb.biography.findFirst({
          where: whereCondition,
          select: {
            biographyId: true,
            memorialIdFk: true,
            nicknames: true,
            homeCity: true,
            placesLived: true,
            religion: true,
            education: true,
            work: true,
            hobbies: true,
          },
        }),
      ]);

      if (!biographyData || !biographyData[0])
        return Promise.resolve(null);

      return Promise.resolve(
        new BiographyModel(
          biographyData[0].biographyId,
          biographyData[0].memorialIdFk,
          biographyData[0].nicknames,
          biographyData[0].homeCity,
          biographyData[0].placesLived,
          biographyData[0].religion,
          biographyData[0].education,
          biographyData[0].work,
          biographyData[0].hobbies,
        ),
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
    biographyData: any
  ): Promise<boolean> {
    try {
      const biographyUpdated = await this.executeQueries<Biography>([
        this._prismaDb.biography.update({
          where: {
            memorialIdFk: memorialId,
          },
          data: {
            nicknames: biographyData.nicknames?.trim() ?? '',
            homeCity: biographyData.homeCity?.trim() ?? '',
            placesLived: biographyData.placesLived?.trim() ?? '',
            religion: biographyData.religion?.trim() ?? '',
            education: biographyData.education?.trim() ?? '',
            work: biographyData.work?.trim() ?? '',
            hobbies: biographyData.hobbies?.trim() ?? '',
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
        new ErrorServiceModel(serviceName, 'update', { currentUserId, memorialId, biographyData }),
        error.message,
      );
      throw error;
    }
  }
}

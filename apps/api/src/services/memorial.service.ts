import { LogTypeError, Memorial, Prisma, Relative } from '@prisma/client';
import {
  AdminListMemorialModel,
  AdminMemorialModel,
  ErrorServiceModel,
  MemorialCreateModel,
  MemorialModel,
  MyMemorialModel,
} from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import * as Constantes from '../helpers/constantes/_.constantes';
import * as _ from 'lodash';
import { IncludeDataExistsEnum } from '../enums/_.enums';
import { RedisService } from './commons/redis.service';
import { MemorialSearchModel } from '../models/_.models';
import { CountryService } from './country.service';
import { StringHelpers } from '../helpers/_.helpers';

const serviceName = 'MemorialsService';

export class MemorialService extends CommonService {
  private static _instance: MemorialService;

  static getInstance(): MemorialService {
    if (!MemorialService._instance) {
      MemorialService._instance = new MemorialService();
    }
    return MemorialService._instance;
  }

  constructor() {
    super();
  }

  //#region Admin
  async getAll(page: number, pageSize: number): Promise<AdminListMemorialModel | null> {
    try {
      const take = pageSize;
      const skip = (page < 0 ? 0 : page) * pageSize;

      const totalMemorials = await this.executeQueries<number>([
        this._prismaDb.memorial.count()
      ]);

      if (totalMemorials == null || totalMemorials.length == 0 || totalMemorials[0] == 0) {
        return Promise.resolve({
          total: 0,
          memorialItems: []
        })
      }

      const memorialData = await this.executeQueries<Memorial[]>([
        this._prismaDb.memorial.findMany({
          skip: skip,
          take: take,
          orderBy: [
            {
              createAt: 'desc',
            },
          ],
          select: {
            memorialId: true,
            url: true,
            firstname: true,
            lastname: true,
            yearOfDeath: true,
            monthOfDeath: true,
            dayOfDeath: true,
            countryOfDeathIdFk: true,
            createAt: true,
            updateAt: true,
            disabled: true
          }
        }),
      ]);

      if (memorialData == null || memorialData == undefined || memorialData.length == 0)
      return Promise.resolve(null);

      const countries = await CountryService.getInstance().list();

      const returnData = _.map<Memorial, AdminMemorialModel>(
        memorialData[0],
        (item: Memorial) => {
          const countryOfDeath = _.find(
            countries,
            (c) => c != undefined && c.id == item.countryOfDeathIdFk,
          );
          
          return new AdminMemorialModel(
            item.memorialId,
            item.url,
            item.firstname,
            item.lastname,
            item.yearOfDeath,
            item.monthOfDeath,
            item.dayOfDeath,
            {
              id: +countryOfDeath?.id!,
              code: countryOfDeath?.code!,
              flag: countryOfDeath?.flag!,
            },
            item.createAt,
            item.updateAt,
            item.disabled
          );
        },
      );

      return Promise.resolve({
        total: totalMemorials[0],
        memorialItems: returnData
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getAll', { page }),
        error.message,
      );
      throw error;
    }
  }
  //#endregion

  //#region Public
  async create(
    currentUserId: string,
    memorialData: any,
    urlGenerated: string,
  ): Promise<MemorialCreateModel> {
    try {
      const memorialCreated = await this.executeQueries<Memorial>([
        this._prismaDb.memorial.create({
          data: {
            url: urlGenerated,
            firstname: memorialData.firstname.trim(),
            lastname: memorialData.lastname.trim(),
            yearOfDeath: memorialData.yearOfDeath,
            monthOfDeath: memorialData.monthOfDeath ?? 0,
            dayOfDeath: memorialData.dayOfDeath ?? 0,
            countryOfDeathIdFk: +memorialData.countryOfDeath,
            cityOfDeath: memorialData.cityOfDeath?.trim(),
            shortBiography: memorialData.shortBiography?.trim(),
            createByIdFk: currentUserId,
            updateByIdFk: currentUserId,
            disabled: false,
            memorialUserRelationship: {
              create: {
                userIdFk: currentUserId,
                relationship: memorialData.relative,
                isAdmin: true
              },
            },
          },
        }),
      ]);

      return Promise.resolve({
        id: memorialCreated[0].memorialId,
        url: memorialCreated[0].url,
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'create', { currentUserId, memorialData, urlGenerated }),
        error.message,
      );
      throw error;
    }
  }

  async getById(
    includeData: IncludeDataExistsEnum,
    memorialId: number,
  ): Promise<MemorialModel | null> {
    try {
      // get memorial
      let whereCondition: any = { memorialId: memorialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const memorialData = await this.executeQueries<Memorial>([
        this._prismaDb.memorial.findFirst({
          where: whereCondition,
        }),
      ]);

      if (!memorialData || !memorialData[0]) {
        return Promise.resolve(null);
      }

      // add to Redis
      const memorialObject = await this.addToRedis(memorialData[0]);

      // return value
      return Promise.resolve(memorialObject);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getById', {
          includeData,
          memorialId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async getByUrl(
    includeData: IncludeDataExistsEnum,
    memorialUrl: string,
  ): Promise<MemorialModel | null> {
    try {
      // get memorial from Redis
      const data = await this.getFromRedis(memorialUrl);
      if (data != null) return Promise.resolve(data);

      let whereCondition: any = { url: memorialUrl };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const memorialData = await this.executeQueries<Memorial>([
        this._prismaDb.memorial.findFirst({
          where: whereCondition,
        }),
      ]);

      if (!memorialData || !memorialData[0]) {
        return Promise.resolve(null);
      }

      // add to Redis
      const memorialObject = await this.addToRedis(memorialData[0]);

      // return value
      return Promise.resolve(memorialObject);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getByUrl', {
          includeData,
          memorialUrl,
        }),
        error.message,
      );
      throw error;
    }
  }

  async getMyMemorials(currentUserId: string): Promise<MyMemorialModel[] | null> {
    try {
      let query = 'SELECT m."memorialId", m."url", m."firstname", m."lastname", m."yearOfDeath", m."countryOfDeathIdFk", m."disabled"';
      query += ' from memorials m'
      query += ' join users u on u."userId" = m."createByIdFk"'
      query += ' join "memorialUserRelationship" mr on mr."memorialIdFk" = m."memorialId" and mr."userIdFk" = \'' + currentUserId + '\''
      query += ' and mr."isAdmin" = true'

      const memorialData = await this.executeQueries<Memorial[]>([
        this._prismaDb.$queryRaw(Prisma.sql([query]))
      ]);

      if (memorialData == null || memorialData == undefined)
      return Promise.resolve(null);

      if (memorialData == null || memorialData.length == 0)
      return Promise.resolve([]);

      const countries = await CountryService.getInstance().list();

      const returnData = _.map<Memorial, MyMemorialModel>(
        memorialData[0],
        (item: Memorial) => {
          const countryOfDeath = _.find(
            countries,
            (c) => c != undefined && c.id == item.countryOfDeathIdFk,
          );
          
          return new MyMemorialModel(
            item.url,
            item.firstname,
            item.lastname,
            item.yearOfDeath,
            {
              id: +countryOfDeath?.id!,
              code: countryOfDeath?.code!,
              flag: countryOfDeath?.flag!,
            },
            item.disabled
          );
        },
      );

      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getMyMemorials', { currentUserId }),
        error.message,
      );
      throw error;
    }
  }

  async searchByUrl(
    includeData: IncludeDataExistsEnum,
    searchValue: string,
    maxResult: number,
  ): Promise<MemorialSearchModel[]> {
    try {
      let query = `select "memorialId", url, firstname, lastname, "yearOfDeath", "countryOfDeathIdFk" from memorials where `;
      if (searchValue.trim().includes(' ')) {
        query += `unaccent(lower(url)) like '%${StringHelpers.replaceAll(searchValue, ' ', '-')}%'`;
      } else {
        query += `(unaccent(lower(firstname)) like '%${searchValue}%' or unaccent(lower(lastname)) like '%${searchValue}%')`;
      }
      if (
        includeData == IncludeDataExistsEnum.ActiveData ||
        includeData == IncludeDataExistsEnum.InactiveData
      ) {
        query +=
          ' and disabled = ' +
          (includeData == IncludeDataExistsEnum.ActiveData ? false : true);
      }
      query += ` limit ${maxResult}`;

      const memorials = await this.executeQueries<Memorial[]>([
        this._prismaDb.$queryRaw(Prisma.sql([query]))
      ]);

      if (
        memorials == null ||
        memorials[0] == null ||
        memorials[0].length == 0
      ) {
        return Promise.resolve([]);
      }

      const countries = await CountryService.getInstance().list();

      // Mappage
      const returnData = _.map<Memorial, MemorialSearchModel>(
        memorials[0],
        (item: Memorial) => {
          const countryOfDeath = _.find(
            countries,
            (c) => c != undefined && c.id == item.countryOfDeathIdFk,
          );
          return new MemorialSearchModel(
            item.memorialId,
            item.url,
            item.firstname,
            item.lastname,
            item.yearOfDeath,
            {
              id: +countryOfDeath?.id!,
              code: countryOfDeath?.code!,
              flag: countryOfDeath?.flag!,
            },
          );
        },
      );

      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'searchByUrl', {
          includeData,
          searchValue,
          maxResult,
        }),
        error.message,
      );
      throw error;
    }
  }

  async search(
    includeData: IncludeDataExistsEnum,
    firstname: string | undefined,
    lastname: string | undefined,
    year: string | undefined,
    country: string | undefined,
    maxResult: number,
  ): Promise<MemorialSearchModel[]> {
    try {
      let query = `select "memorialId", url, firstname, lastname, "yearOfDeath", "countryOfDeathIdFk" from memorials where `;
      
      const whereArray = new Array<string>();
      if (firstname) {
        whereArray.push(`unaccent(lower(firstname)) like '%${firstname}%'`) ;
      }
      if (lastname) {
        whereArray.push(`unaccent(lower(lastname)) like '%${lastname}%'`) ;
      }
      if (year) {
        whereArray.push(`"yearOfDeath" = ${year}`);
      }
      if (country) {
        whereArray.push(`"countryOfDeathIdFk" = ${country}`);
      }
      query += whereArray.join(' and ');

      if (
        includeData == IncludeDataExistsEnum.ActiveData ||
        includeData == IncludeDataExistsEnum.InactiveData
      ) {
        query +=
          ' and disabled = ' +
          (includeData == IncludeDataExistsEnum.ActiveData ? false : true);
      }
      query += ` limit ${maxResult}`;

      const memorials = await this.executeQueries<Memorial[]>([
        this._prismaDb.$queryRaw(Prisma.sql([query]))
      ]);

      if (
        memorials == null ||
        memorials[0] == null ||
        memorials[0].length == 0
      ) {
        return Promise.resolve([]);
      }

      const countries = await CountryService.getInstance().list();

      // Mappage
      const returnData = _.map<Memorial, MemorialSearchModel>(
        memorials[0],
        (item: Memorial) => {
          const countryOfDeath = _.find(
            countries,
            (c) => c != undefined && c.id == item.countryOfDeathIdFk,
          );
          return new MemorialSearchModel(
            item.memorialId,
            item.url,
            item.firstname,
            item.lastname,
            item.yearOfDeath,
            {
              id: +countryOfDeath?.id!,
              code: countryOfDeath?.code!,
              flag: countryOfDeath?.flag!,
            },
          );
        },
      );

      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'search', {
          includeData,
          firstname,
          lastname,
          year,
          country,
          maxResult,
        }),
        error.message,
      );
      throw error;
    }
  }

  async getMemorialUrl(memorialId: number, includeData: IncludeDataExistsEnum): Promise<string> {
    try {
      let whereCondition: any = { memorialId: memorialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const memorialData = await this.executeQueries<Memorial>([
        this._prismaDb.memorial.findFirst({
          where: whereCondition,
          select: {
            url: true
          }
        }),
      ]);

      if (!memorialData || !memorialData[0]) {
        return Promise.resolve('');
      }

      // return value
      return Promise.resolve(memorialData[0].url);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getMemorialUrl', {
          memorialId,
          includeData
        }),
        error.message,
      );
      throw error;
    }
  }

  async update(
    currentUserId: string,
    memorialId: number,
    memorialUrl: string,
    memorialData: any
  ): Promise<boolean> {
    try {
      const memorialUpdated = await this.executeQueries<Memorial>([
        this._prismaDb.memorial.update({
          where: {
            memorialId: memorialId,
          },
          data: {
            url: memorialUrl,
            firstname: memorialData.firstname.trim(),
            lastname: memorialData.lastname.trim(),
            yearOfBirth: memorialData.yearOfBirth,
            monthOfBirth: memorialData.monthOfBirth,
            dayOfBirth: memorialData.dayOfBirth,
            countryOfBirthIdFk: memorialData.countryOfBirth == 0 ? null : memorialData.countryOfBirth,
            cityOfBirth: memorialData.cityOfBirth?.trim(),
            yearOfDeath: memorialData.yearOfDeath,
            monthOfDeath: memorialData.monthOfDeath,
            dayOfDeath: memorialData.dayOfDeath,
            countryOfDeathIdFk: memorialData.countryOfDeath,
            cityOfDeath: memorialData.cityOfDeath?.trim(),
            shortBiography: memorialData.shortBiography?.trim(),
            updateByIdFk: currentUserId,
            updateAt: new Date(),
            disabled: false,
            memorialUserRelationship: {
              update: {
                where: {
                  memorialIdFk_userIdFk: {
                    memorialIdFk: memorialId,
                    userIdFk: currentUserId
                  }
                },
                data: {
                  relationship: memorialData.relative,
                }
              }
            }
          },
        }),
      ]);

      // add to Redis
      await this.addToRedis(memorialUpdated[0]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'update', { currentUserId, memorialId, memorialUrl, memorialData }),
        error.message,
      );
      throw error;
    }
  }

  async delete(currentUserId: string, memorialUrl: string): Promise<string> {
    try {
      const memorialDeleted = await this.executeQueries<Memorial>([
        this._prismaDb.memorial.update({
          data: {
            disabled: true,
            updateByIdFk: currentUserId,
          },
          where: {
            url: memorialUrl,
          },
          select: {
            url: true,
          },
        }),
      ]);

      // remove from Redis
      await RedisService.getInstance().deleteData([
        Constantes.PrefixMemorialKey,
        memorialUrl,
      ]);

      return Promise.resolve(memorialDeleted[0].url);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'delete', { currentUserId, memorialUrl }),
        error.message,
      );
      throw error;
    }
  }

  async numberSimilarUrls(
    includeData: IncludeDataExistsEnum,
    memorialUrl: string,
  ): Promise<number> {
    try {
      let whereCondition: any = {
        url: {
          startsWith: memorialUrl.toLocaleLowerCase().trim(),
        },
      };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const count = await this.executeQueries<number>([
        this._prismaDb.memorial.count({
          where: whereCondition,
        }),
      ]);

      return Promise.resolve(count[0]);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'existsByUrl', {
          includeData,
          memorialUrl,
        }),
        error.message,
      );
      throw error;
    }
  }

  async existsById(includeData: IncludeDataExistsEnum, memorialId: number) {
    try {
      let whereCondition: any = { memorialId: memorialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const count = await this.executeQueries<number>([
        this._prismaDb.memorial.count({
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

  async existsByUrl(
    includeData: IncludeDataExistsEnum,
    memorialUrl: string,
  ): Promise<boolean> {
    try {
      let whereCondition: any = { url: memorialUrl.toLocaleLowerCase().trim() };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const count = await this.executeQueries<number>([
        this._prismaDb.memorial.count({
          where: whereCondition,
        }),
      ]);

      return Promise.resolve(count[0] == 1);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'existsByUrl', {
          includeData,
          memorialUrl,
        }),
        error.message,
      );
      throw error;
    }
  }

  private async getFromRedis(memorialUrl: string): Promise<MemorialModel | null> {
    const data = await RedisService.getInstance().getObject([
      Constantes.PrefixMemorialKey,
      memorialUrl,
    ]);
    if (data != null) return Promise.resolve(<MemorialModel>data);

    return Promise.resolve(null);
  }

  private async addToRedis(memorialDb: Memorial): Promise<MemorialModel> {
    const countryOfBirth = (memorialDb.countryOfBirthIdFk && memorialDb.countryOfBirthIdFk > 0) ? await CountryService.getInstance().getById(
      memorialDb.countryOfBirthIdFk,
    ) : null;

    const countryOfDeath = await CountryService.getInstance().getById(
      memorialDb.countryOfDeathIdFk,
    );

    // Mappage for Redis
    const returnData = new MemorialModel(
      memorialDb.memorialId,
      memorialDb.url,
      memorialDb.firstname,
      memorialDb.lastname,
      memorialDb.yearOfBirth,
      memorialDb.monthOfBirth,
      memorialDb.dayOfBirth,
      {
        id: +countryOfBirth?.id!,
        code: countryOfBirth?.code!,
        flag: countryOfBirth?.flag!,
      },
      memorialDb.cityOfBirth ?? '',
      memorialDb.yearOfDeath,
      memorialDb.monthOfDeath,
      memorialDb.dayOfDeath,
      {
        id: +countryOfDeath?.id!,
        code: countryOfDeath?.code!,
        flag: countryOfDeath?.flag!,
      },
      memorialDb.cityOfDeath ?? '',
      memorialDb.shortBiography ?? '',
      Relative.Undefined
    );

      // add to Redis
      await RedisService.getInstance().setObject(
        [Constantes.PrefixMemorialKey, returnData.url],
        returnData,
      );

      // set expiration for Redis
      await RedisService.getInstance().addExpiration(
        [Constantes.PrefixMemorialKey, returnData.url],
        Constantes.MemorialExpiration,
      );

      return Promise.resolve(returnData);
  }
  //#endregion
}

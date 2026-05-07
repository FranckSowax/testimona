import { Country, LogTypeError } from '@prisma/client';
import * as Constantes from '../helpers/constantes/_.constantes';
import {
  ErrorServiceModel,
  CountryModel,
} from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import { RedisService } from './commons/redis.service';
import * as _ from 'lodash';

const serviceName = 'CountryService';

export class CountryService extends CommonService {
  private static _instance: CountryService;

  static getInstance(): CountryService {
    if (!CountryService._instance) {
      CountryService._instance = new CountryService();
    }
    return CountryService._instance;
  }

  constructor() {
    super();
  }

  async getById(id: number): Promise<CountryModel | undefined> {
    try {
      if (id == 0) {
        return Promise.resolve(undefined);
      }

      const countryData = await this.list();
      const countryItem = _.find(countryData, (country: CountryModel) => {
        return country.id == id;
      });

      return Promise.resolve(countryItem);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getById', { id }),
        error.message,
      );
      throw error;
    }
  }

  async list(): Promise<CountryModel[]> {
    try {
      const data = await RedisService.getInstance().getArray([
        Constantes.PrefixListKey,
        Constantes.CountryKey,
      ]);
      if (data != null && data.length > 0)
        return Promise.resolve(<CountryModel[]>data);

      const countryData = await this.executeQueries<Country[]>([
        this._prismaDb.country.findMany({
          where: {
            disabled: false,
          },
          select: {
            countryId: true,
            code: true,
            name: true,
            flag: true,
          },
        }),
      ]);

      if (countryData == null || countryData.length == 0)
        return Promise.resolve([]);

      const returnData = _.map<Country, CountryModel>(
        countryData[0],
        (item: Country) => {
          return new CountryModel(
            item.countryId,
            item.code,
            item.name,
            item.flag,
          );
        },
      );

      await RedisService.getInstance().setArray(
        [
          Constantes.PrefixListKey,
          Constantes.CountryKey,
        ],
        returnData,
      );

      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'list', {}),
        error.message,
      );
      throw error;
    }
  }
}

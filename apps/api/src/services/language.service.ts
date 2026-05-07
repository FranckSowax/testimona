import { Language, LogTypeError } from '@prisma/client';
import * as Constantes from '../helpers/constantes/_.constantes';
import { ErrorServiceModel, LanguageModel } from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import { RedisService } from './commons/redis.service';
import * as _ from 'lodash';

const serviceName = 'LanguageService';

export class LanguageService extends CommonService {
  private static _instance: LanguageService;

  static getInstance(): LanguageService {
    if (!LanguageService._instance) {
      LanguageService._instance = new LanguageService();
    }
    return LanguageService._instance;
  }

  constructor() {
    super();
  }

  async getById(id: number): Promise<LanguageModel | undefined> {
    try {
      const data = await RedisService.getInstance().getArray([
        Constantes.PrefixListKey,
        Constantes.LanguageKey,
      ]);
      if (data != null && data.length > 0) {
        return Promise.resolve(_.find(<LanguageModel[]>data, (lang: LanguageModel) => {
          return lang.id == id;
        }));
      }

      const languageData = await this.list();

      return Promise.resolve(_.find(languageData, (lang: LanguageModel) => {
        return lang.id == id;
      }));
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

  async getByCode(code: string): Promise<LanguageModel | undefined> {
    try {
      const data = await RedisService.getInstance().getArray([
        Constantes.PrefixListKey,
        Constantes.LanguageKey,
      ]);
      if (data != null && data.length > 0) {
        return Promise.resolve(_.find(<LanguageModel[]>data, (lang: LanguageModel) => {
          return lang.code.toLocaleLowerCase() == code.toLocaleLowerCase();
        }));
      }

      const languageData = await this.list();

      return Promise.resolve(_.find(languageData, (lang: LanguageModel) => {
        return lang.code.toLocaleLowerCase() == code.toLocaleLowerCase();
      }));
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getByCode', { code }),
        error.message,
      );
      throw error;
    }
  }

  async list(): Promise<LanguageModel[]> {
    try {
      const data = await RedisService.getInstance().getArray([
        Constantes.PrefixListKey,
        Constantes.LanguageKey,
      ]);
      if (data != null && data.length > 0) return Promise.resolve(<LanguageModel[]>data);

      const languageData = await this.executeQueries<Language[]>([
        this._prismaDb.language.findMany({
          where: {
            disabled: false,
          },
          select: {
            languageId: true,
            code: true,
            label: true,
          },
        }),
      ]);

      if (languageData == null || languageData.length == 0){
        return [];
      }

      const returnData = _.map<Language, LanguageModel>(
        languageData[0],
        (item: Language) => {
          return new LanguageModel(item.languageId, item.code, item.label);
        },
      );

      await RedisService.getInstance().setArray(
        [Constantes.PrefixListKey, Constantes.LanguageKey],
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

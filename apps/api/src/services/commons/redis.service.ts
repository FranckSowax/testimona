import { LogTypeError } from '@prisma/client';
import { createClient } from 'redis';
import * as Constantes from '../../helpers/constantes/_.constantes';
import { ErrorServiceModel } from '../../models/_.models';
import { LogService } from './log.service';

const serviceName = 'RedisService';

export class RedisService {
  private _redisDb: any;
  private static _instance: RedisService;

  static getInstance(): RedisService {
    if (!RedisService._instance) {
      RedisService._instance = new RedisService();
    }
    return RedisService._instance;
  }

  constructor() {
    this._redisDb = createClient({
      url: Constantes.RedisDbUrl
    });

    this._redisDb.on('connect', () => {
      console.info('Redis is connected (connect)');
    });

    this._redisDb.on('ready', () => {
      console.info('Redis is ready (ready)');
    });

    this._redisDb.on('end', () => {
      console.info('Redis is disconnected (end)');
    });

    this._redisDb.on('error', (err: any) => {
      console.info('Redis is disconnected (end)', err);
    });

    this._redisDb.connect();
  }

  async addExpiration(keys: string[], expiration: number): Promise<boolean> {
    const key = this.getKeyFormatted(keys);
    try {
      return await this._redisDb.expire(key, expiration).catch((err: any) => {
        throw err;
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'addExpiration', {
          key,
          expiration,
        }),
        error.message,
      );
      throw error;
    }
  }

  async deleteData(keys: string[]): Promise<boolean> {
    const key = this.getKeyFormatted(keys);
    try {
      return await this._redisDb.del(key).catch((err: any) => {
        throw err;
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'deleteData', { key }),
        error.message,
      );
      throw error;
    }
  }

  async getArray(keys: string[]): Promise<any> {
    const key = this.getKeyFormatted(keys);
    try {
      return JSON.parse(
        await this._redisDb.get(key).catch((err: any) => {
          throw err;
        }),
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getData', { key }),
        error.message,
      );
      throw error;
    }
  }

  async getData(keys: string[]): Promise<any> {
    const key = this.getKeyFormatted(keys);
    try {
      return await this._redisDb.get(key).catch((err: any) => {
        throw err;
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getData', { key }),
        error.message,
      );
      throw error;
    }
  }

  async getObject(keys: string[]): Promise<any> {
    const key = this.getKeyFormatted(keys);
    try {
      return JSON.parse(
        await this._redisDb.get(key).catch((err: any) => {
          throw err;
        }),
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getObject', { key }),
        error.message,
      );
      throw error;
    }
  }

  async keyExists(keys: string[]): Promise<boolean> {
    const key = this.getKeyFormatted(keys);
    try {
      return await this._redisDb.exists(key).catch((err: any) => {
        throw err;
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'deleteData', { key }),
        error.message,
      );
      throw error;
    }
  }

  async setArray<T>(keys: string[], value: T[]): Promise<boolean> {
    const key = this.getKeyFormatted(keys);
    try {
      return await this._redisDb.set(key, JSON.stringify(value)).catch(
        (err: any) => {
          throw err;
        },
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'setArray', { key, value }),
        error.message,
      );
      throw error;
    }
  }

  async setData(keys: string[], value: string): Promise<boolean> {
    const key = this.getKeyFormatted(keys);
    try {
      return await this._redisDb.set(key, value).catch((err: any) => {
        throw err;
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'addData', { key, value }),
        error.message,
      );
      throw error;
    }
  }

  async setObject<T>(keys: string[], value: T): Promise<boolean> {
    const key = this.getKeyFormatted(keys);
    try {
      return await this._redisDb.set(key, JSON.stringify(value)).catch(
        (err: any) => {
          throw err;
        },
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'setObject', { key, value }),
        error.message,
      );
      throw error;
    }
  }

  private getKeyFormatted(keys: string[]): string {
    return keys.join(':');
  }
}

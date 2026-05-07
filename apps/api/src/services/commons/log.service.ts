import { Log, LogTypeError } from '@prisma/client';
import { ErrorServiceModel } from '../../models/_.models';
import { CommonService } from './common.service';

export class LogService extends CommonService {
  private static _instance: LogService;

  static getInstance(): LogService {
    if (!LogService._instance) {
      LogService._instance = new LogService();
    }
    return LogService._instance;
  }

  constructor() {
    super();
  }

  async create(
    logType: LogTypeError,
    errorData: ErrorServiceModel,
    catchError: string,
  ) {
    try {
      await this.executeQueries<Log>([this._prismaDb.log.create({
        data: {
          Type: logType,
          Info: JSON.stringify(errorData),
          Error: catchError,
        },
      })]);
    } catch (err) {
      console.log({
        Service: 'LogService',
        Action: 'Create',
        LogType: logType,
        errorToLog: errorData,
        Error: err,
      });
    }
  }
}

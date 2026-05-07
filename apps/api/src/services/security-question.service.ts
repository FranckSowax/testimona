import { LogTypeError, SecurityQuestion, SecurityQuestionUserAnswer } from '@prisma/client';
import * as Constantes from '../helpers/constantes/_.constantes';
import { ErrorServiceModel, SecurityQuestionModel } from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import { RedisService } from './commons/redis.service';
import * as _ from 'lodash';
import { SecurityQuestionAnswerModel } from '../models/services/security-question.model';
import { SecretAnswerKey } from '../helpers/constantes/_.constantes';
import { CryptoService } from './commons/crypto.service';

const serviceName = 'SecurityQuestionService';

export class SecurityQuestionService extends CommonService {
  private static _instance: SecurityQuestionService;

  static getInstance(): SecurityQuestionService {
    if (!SecurityQuestionService._instance) {
      SecurityQuestionService._instance = new SecurityQuestionService();
    }
    return SecurityQuestionService._instance;
  }

  constructor() {
    super();
  }

  async list(): Promise<SecurityQuestionModel[]> {
    try {
      const data = await RedisService.getInstance().getArray([
        Constantes.PrefixListKey,
        Constantes.SecurityQuestionKey,
      ]);
      if (data != null && data.length > 0) return Promise.resolve(<SecurityQuestionModel[]>data);

      const secuQuestData = await this.executeQueries<SecurityQuestion[]>([
        this._prismaDb.securityQuestion.findMany({
          select: {
            securityQuestionsId: true,
            contentKey: true,
          },
        }),
      ]);

      if (secuQuestData == null || secuQuestData.length == 0) {
        return Promise.resolve([]);
      }

      const returnData = _.map<SecurityQuestion, SecurityQuestionModel>(secuQuestData[0], (item: SecurityQuestion) => {
        return new SecurityQuestionModel(item.securityQuestionsId, item.contentKey);
      });

      await RedisService.getInstance().setArray(
        [
          Constantes.PrefixListKey,
          Constantes.SecurityQuestionKey,
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

  async getQuestions(userId: string): Promise<SecurityQuestionAnswerModel[]> {
    try {
      const secuQuestData = await this.executeQueries<any[]>([
        this._prismaDb.securityQuestionUserAnswer.findMany({
          where: {
            userIdFk: userId
          },
          select: {
            securityQuestionsIdFk: true,
            securityQuestions: {
              select: {
                contentKey: true
              }
            }
          },
        }),
      ]);

      if (secuQuestData == null || secuQuestData.length == 0) {
        return Promise.resolve([]);
      }
      
      const returnData = _.map<any, SecurityQuestionAnswerModel>(secuQuestData[0], (item: any) => {
        return new SecurityQuestionAnswerModel(item.securityQuestionsIdFk, item.securityQuestions.contentKey);
      });

      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getQuestionAnswers', {}),
        error.message,
      );
      throw error;
    }
  }
}

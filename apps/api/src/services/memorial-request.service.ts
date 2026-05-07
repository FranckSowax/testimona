import { LogTypeError, MemorialRequestAdmin, MemorialRequestAdminStatus } from '@prisma/client';
import { ErrorServiceModel, MemorialRequestCreateModel } from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import * as _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { MemorialRequestModel } from '../models/services/memorial-request.model';

const serviceName = 'MemorialRequestService';

export class MemorialRequestService extends CommonService {
  private static _instance: MemorialRequestService;

  static getInstance(): MemorialRequestService {
    if (!MemorialRequestService._instance) {
        MemorialRequestService._instance = new MemorialRequestService();
    }
    return MemorialRequestService._instance;
  }

  constructor() {
    super();
  }

  async create(
    currentUserId: string,
    requestData: any,
  ): Promise<MemorialRequestCreateModel> {
    try {
      const memorialRequestCreated = await this.executeQueries<MemorialRequestAdmin>([
        this._prismaDb.memorialRequestAdmin.create({
          data: {
            memorialRequestAdminId: uuidv4(),
            memorialIdFk: requestData.memorialId,
            applicantUserIdFk: currentUserId,
            relationship: requestData.relative,
            note: requestData.note,
            status: MemorialRequestAdminStatus.Pending,
            updateByIdFk: currentUserId
          },
        }),
      ]);

      return Promise.resolve({
        id: memorialRequestCreated[0].memorialRequestAdminId,
        memorialId: memorialRequestCreated[0].memorialIdFk,
        applicantId: memorialRequestCreated[0].applicantUserIdFk,
        relationship: memorialRequestCreated[0].relationship,
        note: memorialRequestCreated[0].note,
        status: memorialRequestCreated[0].status,
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'create', { currentUserId, requestData }),
        error.message,
      );
      throw error;
    }
  }

  async getById(requestId: string): Promise<MemorialRequestModel | null> {
    try {
      const memorialRequestItem = await this.executeQueries<MemorialRequestAdmin>([
        this._prismaDb.memorialRequestAdmin.findUnique({
          where: {
            memorialRequestAdminId: requestId
          },
          select: {
            memorialRequestAdminId: true,
            memorialIdFk: true,
            applicantUserIdFk: true,
            relationship: true,
            note: true,
            status: true
          },
        }),
      ]);

      if (!memorialRequestItem || !memorialRequestItem[0]) {
        return Promise.resolve(null);
      }


      return Promise.resolve({
        id: memorialRequestItem[0].memorialRequestAdminId,
        memorialId: memorialRequestItem[0].memorialIdFk,
        applicantId: memorialRequestItem[0].applicantUserIdFk,
        relationship: memorialRequestItem[0].relationship,
        note: memorialRequestItem[0].note,
        status: memorialRequestItem[0].status,
      });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getById', { requestId }),
        error.message,
      );
      throw error;
    }
  }

  async update(requestId: string, requestStatus: MemorialRequestAdminStatus, adminUserId: string): Promise<boolean> {
    try {
      const memorialRequestUpdated = await this.executeQueries<MemorialRequestAdmin>([
        this._prismaDb.memorialRequestAdmin.update({
          where: {
            memorialRequestAdminId: requestId,
          },
          data: {
            status: requestStatus,
            updateByIdFk: adminUserId,
            updateAt: new Date()
          },
        }),
      ]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'update', { requestId, requestStatus, adminUserId }),
        error.message,
      );
      throw error;
    }
  }
}
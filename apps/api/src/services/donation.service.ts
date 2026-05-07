import { Donation, DonationStatus, LogTypeError, MemorialDonation } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid';
import { DonationStartProcessRequestModel } from "../models/requests/donation.model";
import { AdminDonationServiceModel, DonationGoalServiceModel, DonationServiceModel, DonationStartProcessServiceModel, DonationStripeServiceModel, DonationUpdatedServiceModel } from "../models/services/donation.model";
import { CommonService } from "./commons/common.service";
import { LogService } from "./commons/log.service";
import { ErrorServiceModel, UserIdentityModel } from "../models/_.models";
import { StripeService } from "./commons/stripe.service";
import { StripePaymentIntentStatus } from "../models/services/stripe.model";
import { find, map, uniq } from "lodash";
import { UserService } from "./user.service";

const serviceName = 'DonationService';

export class DonationService extends CommonService {
  private static _instance: DonationService;

  static getInstance(): DonationService {
    if (!DonationService._instance) {
        DonationService._instance = new DonationService();
    }
    return DonationService._instance;
  }

  constructor() {
    super();
  }

  //#region Admin
  async adminGetDonationGoal(memorialId: number): Promise<DonationGoalServiceModel> {
    try {
      const donationData = await this.internalGetDonationGoal(memorialId);
      return Promise.resolve(donationData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'adminGetDonationGoal', { memorialId }),
        error.message,
      );
      throw error;
    }
  }

  async adminListByMemorialId(memorialId: number, page: number, pageSize: number): Promise<AdminDonationServiceModel> {
    try {
      const take = pageSize;
      const skip = (page < 0 ? 0 : page) * pageSize;

      const totalDonations = await this.executeQueries<number>([
        this._prismaDb.donation.count({
          where: {
            memorialIdFk: memorialId
          },
        })
      ]);

      if (totalDonations == null || totalDonations.length == 0 || totalDonations[0] == 0) {
        return Promise.resolve({
          total: 0,
          donationItems: []
        } as AdminDonationServiceModel)
      }

      const donationData = await this.internalGetDonations({
        skip: skip,
        take: take,
        where: {
          memorialIdFk: memorialId
        },
        orderBy: [
          {
            date: 'desc',
          },
        ]
      }, true);

      return Promise.resolve({
        total: totalDonations[0],
        donationItems: donationData
      } as AdminDonationServiceModel);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'adminListByMemorialId', { memorialId, page, pageSize }),
        error.message,
      );
      throw error;
    }
  }
  //#endregion

  //#region Public
  async getDonationGoal(memorialId: number): Promise<DonationGoalServiceModel> {
    try {
      const donationData = await this.internalGetDonationGoal(memorialId);
      return Promise.resolve(donationData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getDonationGoal', { memorialId }),
        error.message,
      );
      throw error;
    }
  }

  async listByMemorialId(memorialId: number): Promise<DonationServiceModel[]> {
    try {
      const donationData = await this.internalGetDonations({
        where: {
          memorialIdFk: memorialId
        },
        orderBy: [
          {
            date: 'desc',
          },
        ]
      }, false);

      return Promise.resolve(donationData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'listByMemorialId', { memorialId }),
        error.message,
      );
      throw error;
    }
  }

  async createByMemorialId(
    currentUserId: string,
    memorialId: number,
    donationData: DonationStartProcessRequestModel,
  ): Promise<DonationStartProcessServiceModel> {
    try {
        const donationCreated = await this.executeQueries<Donation>([
            this._prismaDb.donation.create({
              data: {
                donationId: uuidv4(),
                memorialIdFk: memorialId,
                userIdFk: currentUserId,
                anonymous: donationData.anonymous,
                status: DonationStatus.Processing
              },
            }),
          ]);

        return Promise.resolve({
            donationId: donationCreated[0].donationId
        });
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'createByMemorialId', { memorialId, donationData, currentUserId }),
        error.message,
      );
      throw error;
    }
  }

  async createDonationGoalByMemorialId(memorialId: number): Promise<boolean> {
    try {
      const memorialDonationGoalCreated = await this.executeQueries<MemorialDonation>([
        this._prismaDb.memorialDonation.create({
          data: {
            memorialIdFk: memorialId
          },
        }),
      ]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'createDonationGoalByMemorialId', { memorialId }),
        error.message,
      );
      throw error;
    }
  }

  async retrieveDonationDataInStripe(checkoutId: string): Promise<DonationStripeServiceModel | undefined> {
    try {
        // get checkout sessionn data
        const checkoutSessionData = await StripeService.getInstance().retrieveCheckoutSession(checkoutId);
        if (checkoutSessionData == undefined) {
            return Promise.resolve(undefined);
        }

        // get payment status when requesting payment intent
        const paymentIntentData = await StripeService.getInstance().retrievePaymentIntent(checkoutSessionData.paymentIntent);

        return Promise.resolve({
            checkoutId: checkoutSessionData.checkouId,
            donationId: checkoutSessionData.clientReferenceId,
            amount: checkoutSessionData.amount,
            comment: checkoutSessionData.comment,
            email: checkoutSessionData.email,
            status: paymentIntentData == undefined ? DonationStatus.Processing : this.transformPaymentStatusToDonationStatus(paymentIntentData.paymentStatus)
        });
    } catch (error: any) {
        console.log(error);
        LogService.getInstance().create(
          LogTypeError.Error,
          new ErrorServiceModel(serviceName, 'retrieveDonationDataInStripe', { checkoutId }),
          error.message,
        );
        throw error;
    }
  }

  private transformPaymentStatusToDonationStatus(paymentStatus: StripePaymentIntentStatus): DonationStatus {
    switch(paymentStatus) {
        case "canceled":
            return DonationStatus.Canceled;
        case "processing":
            return DonationStatus.Processing;
        case "requires_action":
            return DonationStatus.Requires_action;
        case "requires_capture":
            return DonationStatus.Requires_capture;
        case "requires_confirmation":
            return DonationStatus.Requires_confirmation;
        case "requires_payment_method":
            return DonationStatus.Requires_payment_method;
        case "succeeded":
            return DonationStatus.Succeeded;
    }
  }

  async updateDonation(donationStripeData: DonationStripeServiceModel): Promise<DonationUpdatedServiceModel | undefined> {
    try {
        const donationUpdated = await this.executeQueries<Donation>([
            this._prismaDb.donation.update({
              where: {
                donationId: donationStripeData.donationId
              },
              data: {
                donorEmail: donationStripeData.email,
                amount: donationStripeData.amount,
                checkoutId: donationStripeData.checkoutId,
                comment: donationStripeData.comment,
                status: donationStripeData.status
              },
              select: {
                donationId: true,
                memorial: {
                    select: {
                      memorialId: true,
                      url: true
                    }
                }
              }
            }),
          ]);

        if (donationUpdated.length == 0) {
            return Promise.resolve(undefined);
        }

        const donationData = donationUpdated[0] as any;
        return Promise.resolve({
            donationId: donationData.donationId,
            memorialId: donationData.memorial.memorialId,
            memorialUrl: donationData.memorial.url
        })
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'updateDonation', { donationStripeData }),
        error.message,
      );
      throw error;
    }
  }

  async updateDonationGoal(memorialId: number, donationGoalAmount: number, message: string): Promise<boolean> {
    try {
        const donationGoalUpdated = await this.executeQueries<MemorialDonation>([
          this._prismaDb.memorialDonation.update({
            where: {
              memorialIdFk: memorialId
            },
            data: {
              DonationGoal: donationGoalAmount,
              Message: message
            }
          }),
        ]);
        
        return Promise.resolve(donationGoalUpdated.length > 0);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'updateDonationGoal', { memorialId, donationGoalAmount, message }),
        error.message,
      );
      throw error;
    }
  }

  async updateMemorialDonationTotalAmount(memorialId: number, donationAmount: number): Promise<boolean> {
    try {
        const donationUpdated = await this.executeQueries<MemorialDonation>([
          this._prismaDb.memorialDonation.update({
            where: {
              memorialIdFk: memorialId
            },
            data: {
              AmountDonation: { increment: donationAmount }
            }
          }),
        ]);
        
        return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'updateDonationGoal', { memorialId, donationAmount }),
        error.message,
      );
      throw error;
    }
  }
  //#endregion

  //#region Commun
  private async internalGetDonations(whereCondition: {}, adminCall: boolean): Promise<DonationServiceModel[]> {
    try {
      const donationData = await this.executeQueries<Donation[]>([
        this._prismaDb.donation.findMany(whereCondition)
      ]);

      if (donationData == null || donationData.length == 0 || donationData[0].length == 0) {
        return Promise.resolve([]);
      }
  
      const userIds = uniq(map(donationData[0], (ite) => { return ite.userIdFk; }));
      const userData = await UserService.getInstance().getIdentityDataForUserIds(userIds);
  
      const returnData = map<Donation, DonationServiceModel>(
        donationData[0],
        (item: Donation) => {
          let userInfos: UserIdentityModel | undefined = undefined;
          if ((adminCall || !item.anonymous) && userData) {
            userInfos = find(userData, ((u) => { return u.userId == item.userIdFk; }));
          }
  
          return { 
            donationId: item.donationId,
            amount: item.amount,
            anonymous: item.anonymous,
            checkoutId: item.checkoutId,
            comment: item.comment,
            date: item.date,
            donorEmail: item.donorEmail,
            memorialIdFk: item.memorialIdFk,
            status: item.status,
            userIdFk: item.userIdFk,
            donorDetails: {
              userId: userInfos?.userId!,
              firstname: userInfos?.firstname,
              lastname: userInfos?.lastname,
              nickname: userInfos?.nickname,
              photos: userInfos?.photos
            }
          } as DonationServiceModel;
        }
      );
      
      return Promise.resolve(returnData);
    } catch (error: any) {
      throw(error);
    }
  }

  private async internalGetDonationGoal(memorialId: number): Promise<DonationGoalServiceModel> {
    try {
      const memorialDonationData = await this.executeQueries<MemorialDonation>([
        this._prismaDb.memorialDonation.findUnique({
          where: {
            memorialIdFk: memorialId
          }
        })
      ]);

      if (memorialDonationData == null || memorialDonationData.length == 0) {
        return Promise.resolve({
          donationGoal: 0,
          totalAmountDonation: 0,
          message: ''
        } as DonationGoalServiceModel);
      }
      
      return Promise.resolve({
        donationGoal: memorialDonationData[0].DonationGoal,
        totalAmountDonation: memorialDonationData[0].AmountDonation,
        message: memorialDonationData[0].Message
      } as DonationGoalServiceModel);
    } catch (error: any) {
      throw(error);
    }
  }
  //#endregion
}
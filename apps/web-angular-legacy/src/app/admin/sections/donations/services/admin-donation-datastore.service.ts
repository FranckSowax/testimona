import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { AdminDonationService } from './admin-donation.service';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { AdminDonationGoalModel, AdminDonationItemModel, AdminDonationModel } from '../models/admin-donation.model';
import { each } from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class AdminDonationDatastoreService {
  private _privateErrorAdminDonationsDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorAdminDonationsDatastore$ = this._privateErrorAdminDonationsDatastore$.asObservable();

  constructor(private adminDonationService: AdminDonationService) { }

  async getAdminDonationGoal(memorialId: number): Promise<AdminDonationGoalModel> {
    return this.adminDonationService.donationGoal(memorialId).then((donationResult: ApiObjectResponseModel) => {
      if (!donationResult.result.success) {
        this._privateErrorAdminDonationsDatastore$.next(donationResult.result.error);
        return Promise.resolve(null);
      }

      return Promise.resolve({
        donationGoal: donationResult.data.donationGoal,
        totalAmountDonation: donationResult.data.totalAmountDonation
      } as AdminDonationGoalModel);
    });
  }

  async getAdminDonationsList(memorialId: number, pg: number, pgSize: number): Promise<AdminDonationModel | null> {
    return this.adminDonationService.getList(memorialId, pg, pgSize).then((donationsResult: ApiObjectResponseModel) => {
      if (!donationsResult.result.success) {
        this._privateErrorAdminDonationsDatastore$.next(donationsResult.result.error);
        return Promise.resolve(null);
      }

      const returnArray = new Array<AdminDonationItemModel>();
      each(donationsResult.data.donations, (item: any) => {
        returnArray.push({
          amount: item.amount,
          anonymous: item.anonymous,
          comment: item.comment,
          date: item.date,
          donorDetails: {
            userId: item.donorDetails.userId,
            firstname: item.donorDetails.firstname,
            lastname: item.donorDetails.lastname,
            nickname: item.donorDetails.nickname,
            photos: item.donorDetails.photos ? {
              urls: {
                circle: item.donorDetails.photos[0].urls.circle,
                full: item.donorDetails.photos[0].urls.full,
                medium: item.donorDetails.photos[0].urls.medium,
                thumbnail: item.donorDetails.photos[0].urls.thumbnail,
              }
            } : undefined
          }
        } as AdminDonationItemModel)
      });

      return Promise.resolve({
        numberOfDonation: donationsResult.data.total,
        donations: returnArray
      } as AdminDonationModel);
    });
  }
}

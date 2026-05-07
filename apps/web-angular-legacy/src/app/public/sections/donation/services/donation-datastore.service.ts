import { Injectable } from '@angular/core';
import { DonationService } from './donation.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { BehaviorSubject } from 'rxjs';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { each } from 'lodash-es';
import { DonationGoalModel, DonationItemModel } from '../models/donation.model';

@Injectable({
  providedIn: 'root'
})
export class DonationDatastoreService {
  private _privateErrorDonationDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorDonationDatastore$ = this._privateErrorDonationDatastore$.asObservable();

  constructor(private donationService: DonationService) { }

  async donationGoal(memorialId: number): Promise<DonationGoalModel> {
    return this.donationService.donationGoal(memorialId).then((donationResult: ApiObjectResponseModel) => {
      if (!donationResult.result.success) {
        this._privateErrorDonationDatastore$.next(donationResult.result.error);
        return Promise.resolve(null);
      }
      return Promise.resolve({
        donationGoal: donationResult.data.donationGoal,
        totalAmountDonation: donationResult.data.totalAmountDonation,
        message: donationResult.data.message
      } as DonationGoalModel);
    });
  }

  async updateDonationGoal(memorialId: number, amount: number, message: string): Promise<boolean> {
    const updateResult = await this.donationService.updateDonationGoal(memorialId, amount, message);
    if (!updateResult.result.success) {
      this._privateErrorDonationDatastore$.next(updateResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }

  async list(memorialId: number): Promise<DonationItemModel[]> {
    return this.donationService.list(memorialId).then((donationResult: ApiObjectResponseModel) => {
      if (!donationResult.result.success) {
        this._privateErrorDonationDatastore$.next(donationResult.result.error);
        return Promise.resolve(null);
      }

      const returnArray = new Array<DonationItemModel>();
      each(donationResult.data, (item) => {
        returnArray.push(item)
      });

      return Promise.resolve(returnArray);
    });
  }

  async startProcessMakeDonation(memorialId: number, isAnonymous: boolean): Promise<string> {
    const startProcessMakeDonationResult = await this.donationService.startProcessMakeDonation(memorialId, isAnonymous);

    if (!startProcessMakeDonationResult.result.success) {
      this._privateErrorDonationDatastore$.next(startProcessMakeDonationResult.result.error);
      return Promise.resolve('');
    }

    return Promise.resolve(startProcessMakeDonationResult.data.id);
  }
}

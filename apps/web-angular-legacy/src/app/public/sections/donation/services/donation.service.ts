import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';

@Injectable({
  providedIn: 'root'
})
export class DonationService {
  constructor(private httpSharedService: HttpSharedService) { }

  async donationGoal(memorialId: number): Promise<ApiObjectResponseModel> {
    // GET: /donation/:memorialId/goal
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/donation/${memorialId}/goal`);
  }

  async updateDonationGoal(memorialId: number, amount: number, message: string): Promise<ApiObjectResponseModel> {
    // POST: /donation/:memorialId/goal
    console.log(message)
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/donation/${memorialId}/goal`, { amount: amount, message: message });
  }

  async list(memorialId: number): Promise<ApiObjectResponseModel> {
    // GET: /donation/:memorialId/list
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/donation/${memorialId}/list`);
  }

  async startProcessMakeDonation(memorialId: number, isAnonymous: boolean): Promise<ApiObjectResponseModel> {
    // POST: /donation/:memorialId
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/donation/${memorialId}`, { anonymous: isAnonymous});
  }
}

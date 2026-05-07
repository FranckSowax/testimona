import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';

@Injectable({
  providedIn: 'root'
})
export class AdminDonationService {

  constructor(private httpSharedService: HttpSharedService) { }

  async donationGoal(memorialId: number, ): Promise<ApiObjectResponseModel> {
    // GET: /admin/donation/:memorialId/goal
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/admin/donations/${memorialId}/goal`);
  }

  async getList(memorialId: number, page: number, pgSize: number): Promise<ApiObjectResponseModel> {
    // GET: /admin/donation/:memorialId?page&pgSize
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/admin/donations/${memorialId}?page=${page}&pgSize=${pgSize}`);
  }
}

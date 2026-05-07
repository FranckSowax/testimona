import { Injectable } from '@angular/core';
import { ApiBooleanResponseModel, ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';
import { AccountSecurityQuestionSaveModel, AccountUserSaveModel } from '../models/my-settings.model';

@Injectable({
  providedIn: 'root',
})
export class MySettingsService {

  constructor(private httpSharedService: HttpSharedService) { }

  async getUserInfo(): Promise<ApiObjectResponseModel> {
    // GET: /user
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/user`);
  }

  async updateUserInfo(dataToUpdate: AccountUserSaveModel): Promise<ApiBooleanResponseModel> {
    // PUT: /user
    return await this.httpSharedService.httpPut<ApiBooleanResponseModel>(`/user`, dataToUpdate);
  }

  async updateAnswerInfo(dataToUpdate: AccountSecurityQuestionSaveModel[]): Promise<ApiBooleanResponseModel> {
    // PUT: /user/questions
    return await this.httpSharedService.httpPut<ApiBooleanResponseModel>(`/user/questions`, {answers: dataToUpdate});
  }
}

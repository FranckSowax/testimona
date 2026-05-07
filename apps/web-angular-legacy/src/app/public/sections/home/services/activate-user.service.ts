import { Injectable } from '@angular/core';
import { ApiBooleanResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';

@Injectable({
  providedIn: 'root'
})
export class ActivateUserService {

  constructor(private httpSharedService: HttpSharedService) { }

  async activateUser(userId: string): Promise<ApiBooleanResponseModel> {
    // POST: /user/activate/:userId
    return await this.httpSharedService.httpPut<ApiBooleanResponseModel>(`/user/activate/${userId}`, {});
  }
}

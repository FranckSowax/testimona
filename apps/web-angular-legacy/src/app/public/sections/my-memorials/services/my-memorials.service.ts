import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';

@Injectable({
  providedIn: 'root',
})
export class MyMemorialsService {

  constructor(private httpSharedService: HttpSharedService) { }

  async getList(): Promise<ApiObjectResponseModel> {
    // GET: /memorials/mymemorials
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/memorials/mymemorials`);
  }

}

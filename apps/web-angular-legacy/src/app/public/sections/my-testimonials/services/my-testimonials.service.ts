import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';

@Injectable({
  providedIn: 'root',
})
export class MyTestimonialsService {

  constructor(private httpSharedService: HttpSharedService) { }

  async getList(): Promise<ApiObjectResponseModel> {
    // GET: /testimonials/mytestimonials
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/testimonials/mytestimonials`);
  }

}

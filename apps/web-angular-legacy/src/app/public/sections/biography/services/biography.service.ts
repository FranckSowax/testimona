import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';
import { BiographyCreateModel } from '../models/biography-create.model';

@Injectable({
  providedIn: 'root',
})
export class BiographyService {
  constructor(private httpSharedService: HttpSharedService) { }

  async get(memorialId: number): Promise<ApiObjectResponseModel> {
    // GET: /biography/:memorialId
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/biography/${memorialId}`);
  }


  async create(biographyCreateModel: BiographyCreateModel, memorialId: number): Promise<ApiObjectResponseModel> {
    // POST: /biography/:memorialId
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/biography/${memorialId}`, biographyCreateModel);
  }

  async update(memorialId: number, biographyEditModel: BiographyCreateModel): Promise<ApiObjectResponseModel> {
    // PUT: /biography/:memorialId
    return await this.httpSharedService.httpPut<ApiObjectResponseModel>(`/biography/${memorialId}`, biographyEditModel);
  }
}

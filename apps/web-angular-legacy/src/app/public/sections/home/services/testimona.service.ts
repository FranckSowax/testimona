import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';
import { MemorialCreateModel } from '../models/memorial.model';
import { TestimonaCreateModel } from '../models/testimona-create.model';

@Injectable({
  providedIn: 'root',
})
export class TestimonaService {

  constructor(private httpSharedService: HttpSharedService) { }

  async create(memorialId: number, testimonaModel: TestimonaCreateModel): Promise<ApiObjectResponseModel> {
    // POST: /testimonial/:memorialId
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/testimonial/${memorialId}`, testimonaModel);
  }

  async createMemorial(memorialModel: MemorialCreateModel): Promise<ApiObjectResponseModel> {
    // POST: /memorial
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/memorial`, memorialModel);
  }
}

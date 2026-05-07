import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';
import { TestimonaCreateModel } from '../models/testimona-create.model';
import { TestimonaEditModel } from '../models/testimona-edit.model';

@Injectable({
  providedIn: 'root',
})
export class TestimonaService {

  constructor(private httpSharedService: HttpSharedService) {}

  async create(memorialId: number ,testimonaModel: TestimonaCreateModel): Promise<ApiObjectResponseModel> {
    // POST: /testimonial/:memorialId
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/testimonial/${memorialId}`, testimonaModel);
  }

  async getList(memorialId: number, page: number, pgSize: number): Promise<ApiObjectResponseModel> {
    // GET: /testimonial/:memorialId/list
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/testimonial/${memorialId}/list?page=${page}&pgSize=${pgSize}`);
  }

  async get(testimonaId: number): Promise<ApiObjectResponseModel> {
    // GET: /testimonial/:testimonaId/detail
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/testimonial/${testimonaId}/detail`);
  }

  async update(testimonaId: number, testimonaEditModel: TestimonaEditModel): Promise<ApiObjectResponseModel> {
    // PUT: /testimonial/:testimonaId
    return await this.httpSharedService.httpPut<ApiObjectResponseModel>(`/testimonial/${testimonaId}`, testimonaEditModel);
  }

  async delete(testimonaId: number): Promise<ApiObjectResponseModel> {
    // DELETE: /testimonial/:testimonialId
    return await this.httpSharedService.httpDelete<ApiObjectResponseModel>(`/testimonial/${testimonaId}`, testimonaId);
  }

  async like(testimonaId: number): Promise<ApiObjectResponseModel> {
    // POST: /testimonial/:testimonialId/like
    return await this.httpSharedService.httpPut<ApiObjectResponseModel>(`/testimonial/${testimonaId}/like`, '');
  }

  async unlike(testimonaId: number): Promise<ApiObjectResponseModel> {
    // POST: /testimonial/:testimonialId/unlike
    return await this.httpSharedService.httpPut<ApiObjectResponseModel>(`/testimonial/${testimonaId}/unlike`, '');
  }

}

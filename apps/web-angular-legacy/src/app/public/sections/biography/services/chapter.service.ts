import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';
import { ChapterCreateModel } from '../models/chapter-create.model';
import { ChapterEditModel } from '../models/chapter-edit.model';

@Injectable({
  providedIn: 'root',
})
export class ChapterService {
  constructor(private httpSharedService: HttpSharedService) { }

  async get(chapterId: number): Promise<ApiObjectResponseModel> {
    // GET: /chapter/:chapterId/detail
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/chapter/${chapterId}/detail`);
  }

  async create(chapterCreateModel: ChapterCreateModel, memorialId: number): Promise<ApiObjectResponseModel> {
    // POST: /chapter/:memorialId
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/chapter/${memorialId}`, chapterCreateModel);
  }

  async update(chapterId: number, chapterEditModel: ChapterEditModel): Promise<ApiObjectResponseModel> {
    // PUT: /chapter/:chapterId
    return await this.httpSharedService.httpPut<ApiObjectResponseModel>(`/chapter/${chapterId}`, chapterEditModel);
  }

  async delete(chapterId: number): Promise<ApiObjectResponseModel> {
    // DELETE: /chapter/:chapterId
    return await this.httpSharedService.httpDelete<ApiObjectResponseModel>(`/chapter/${chapterId}`, '');
  }

  async getList(memorialId: number): Promise<ApiObjectResponseModel> {
    // GET: /chapter/:memorialId
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/chapter/${memorialId}`);
  }
}

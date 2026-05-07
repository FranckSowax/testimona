import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';
import { FuneralCreateEditModel } from '../models/funeral-create-edit.model';
import { FuneralEventCreateModel } from '../models/funeral-event-create.model';
import { FuneralEventEditModel } from '../models/funeral-event-edit.model';

@Injectable({
  providedIn: 'root',
})
export class FuneralService {

  constructor(private httpSharedService: HttpSharedService) { }

  async get(memorialId: number): Promise<ApiObjectResponseModel> {
    // GET: /funeral/:memorialId
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/funeral/${memorialId}`);
  }

  async getFuneralEvent(funeralEventId: number): Promise<ApiObjectResponseModel> {
    // GET: /funeralevent/:funeralEventId/detail
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/funeralevent/${funeralEventId}/detail`);
  }

  async getEvents(memorialId: number): Promise<ApiObjectResponseModel> {
    // GET: /funeralevent/:memorialId
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/funeralevent/${memorialId}`);
  }

  async create(funeralCreateModel: FuneralCreateEditModel, memorialId: number): Promise<ApiObjectResponseModel> {
    // POST: /funeral/:memorialId
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/funeral/${memorialId}`, funeralCreateModel);
  }

  async createEvent(FuneralEventCreateModel: FuneralEventCreateModel, memorialId: number): Promise<ApiObjectResponseModel> {
    // POST: /funeralevent/:memorialId
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/funeralevent/${memorialId}`, FuneralEventCreateModel);
  }

  async updateEvent(FuneralEventEditModel: FuneralEventEditModel, funeralEventId: number): Promise<ApiObjectResponseModel> {
    // PUT: /funeralevent/:funeralEventId
    return await this.httpSharedService.httpPut<ApiObjectResponseModel>(`/funeralevent/${funeralEventId}`, FuneralEventEditModel);
  }

  async deleteEvent(funeralEventId: number): Promise<ApiObjectResponseModel> {
    // DELETE: /funeralevent/:funeralEventId
    return await this.httpSharedService.httpDelete<ApiObjectResponseModel>(`/funeralevent/${funeralEventId}`, '');
  }

  async update(funeralUpdateModel: FuneralCreateEditModel, memorialId: number): Promise<ApiObjectResponseModel> {
    // PUT: /funeral/:memorialId
    return await this.httpSharedService.httpPut<ApiObjectResponseModel>(`/funeral/${memorialId}`, funeralUpdateModel);
  }
}

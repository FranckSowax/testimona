import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';
import { MemorialCreateModel } from '../models/memorial-create.model';
import { MemorialEditModel } from '../models/memorial-edit.model';
import { MemorialRequestAdminModel } from '../models/memorial-request-admin.model';

@Injectable({
  providedIn: 'root',
})
export class MemorialService {

  constructor(private httpSharedService: HttpSharedService) {}

  async create(memorialModel: MemorialCreateModel): Promise<ApiObjectResponseModel> {
    // POST: /memorial
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/memorial`, memorialModel);
  }

  async get(memorialUrl: string): Promise<ApiObjectResponseModel> {
    // GET: /memorial/:memorialUrl
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/memorial/${memorialUrl}`);
  }

  async update(memorialId: number, memorial_edit: MemorialEditModel): Promise<ApiObjectResponseModel> {
    // PUT: /memorial/:memorialId
    return await this.httpSharedService.httpPut<ApiObjectResponseModel>(`/memorial/${memorialId}`, memorial_edit);
  }

  async getAdminList(memorialUrl:string): Promise<ApiObjectResponseModel>  {
    // GET: /memorial/:memorialUrl/admins
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/memorial/${memorialUrl}/admins`);
  }

  async getUserRelationship(memorialId:number): Promise<ApiObjectResponseModel>  {
    // GET: /memorial/:memorialId/relationship
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/memorial/${memorialId}/relationship`);
  }

  async sendRequestAdmin(memorialRequestAdmin:MemorialRequestAdminModel): Promise<ApiObjectResponseModel>  {
    // GET: /memorial/:memorialId/request/admin
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/memorial/request/admin`, memorialRequestAdmin);
  }
}

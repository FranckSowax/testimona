import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';

@Injectable({
  providedIn: 'root',
})
export class AdminMemorialService {

  constructor(private httpSharedService: HttpSharedService) { }

  async getList(page: number, pgSize: number): Promise<ApiObjectResponseModel> {
    // GET: /admin/memorials?page&pgSize
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/admin/memorials?page=${page}&pgSize=${pgSize}`);
  }

}

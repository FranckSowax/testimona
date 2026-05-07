import { Injectable } from '@angular/core';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';

@Injectable({
  providedIn: 'root',
})
export class SearchService {

  constructor(private httpSharedService: HttpSharedService) {}

  async searchMemorial(searchValue: string, maxResult: number): Promise<ApiObjectResponseModel> {
    // GET: memorial/searchbyurl/:numberOfResult/:searchValue
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/memorial/searchbyurl/${maxResult}/${searchValue}`);
  }

  async searchMemorialByCriteria(firstname: string, lastname: string, year: string, country: string, maxResult: number): Promise<ApiObjectResponseModel> {
    let query = new Array<string>();
    // GET: memorial/search/:numberOfResult?firstname&lastname&year&country
    if (firstname != "") {
      query.push(`firstname=${firstname}`)
    }
    if (lastname != "") {
      query.push(`lastname=${lastname}`)
    }
    if (year != "") {
      query.push(`year=${year}`)
    }
    if (country != "") {
      query.push(`country=${country}`)
    }

    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/memorial/search/${maxResult}?${query.join("&")}`);
  }

}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ApiObjectResponseModel } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  private _apiUrl = environment.apiUrl;
  get apiUrl() {
    return this._apiUrl;
  }

  constructor(
    private http: HttpClient
  ) { }

  config(): Promise<ApiObjectResponseModel> {
    // GET: /config
    const url = `${this._apiUrl}/config`;

    return new Promise((resolve, reject) => {
      this.http
        .get(url)
        .toPromise()
        .then((data: any) => {
          return resolve(data);
        })
        .catch((err: any) => {
          console.log(err);
          return reject(null);
        });
    });
  }

  memorialConfig(): Promise<ApiObjectResponseModel> {
    // GET: /config/memorial
    const url = `${this._apiUrl}/config/memorial`;

    return new Promise((resolve, reject) => {
      this.http
        .get(url)
        .toPromise()
        .then((data: any) => {
          return resolve(data);
        })
        .catch((err: any) => {
          console.log(err);
          return reject(null);
        });
    });
  }

}

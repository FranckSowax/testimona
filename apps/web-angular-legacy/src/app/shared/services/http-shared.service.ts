import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiErrorResponseModel } from 'src/app/shared/models/api-response.model';
import { ConfigurationService } from 'src/app/shared/services/configuration.service';

@Injectable({
  providedIn: 'root',
})
export class HttpSharedService {
  private _apiUrl: string;

  constructor(
    private http: HttpClient,
    private configurationService: ConfigurationService,
  ) {
    this._apiUrl = this.configurationService.apiUrl;
  }

  async httpGet<T>(path: string): Promise<T | ApiErrorResponseModel> {
    try {
      const data = await firstValueFrom(this.http.get<T>(this.getUrl(path)));
      return data;
    } catch (err: any) {
      return this.createApiError(err);
    }
  }

  async httpPost<T>(path: string, dataToSend: {}): Promise<T | ApiErrorResponseModel> {
    try {
      const data = await firstValueFrom(this.http.post<T>(this.getUrl(path), dataToSend));
      return data;
    } catch (err: any) {
      return this.createApiError(err);
    }
  }

  async httpPut<T>(path: string, dataToSend: {}): Promise<T | ApiErrorResponseModel> {
    try {
      const data = await firstValueFrom(this.http.put<T>(this.getUrl(path), dataToSend));
      return data;
    } catch (err: any) {
      return this.createApiError(err);
    }
  }

  async httpDelete<T>(path: string, dataToSend: {}): Promise<T | ApiErrorResponseModel> {
    try {
      const data = await firstValueFrom(this.http.delete<T>(this.getUrl(path), dataToSend));
      return data;
    } catch (err: any) {
      return this.createApiError(err);
    }
  }

  private getUrl(path: string): string {
    return `${this._apiUrl}${path}`;
  }

  private createApiError(error: any): ApiErrorResponseModel {
    return new ApiErrorResponseModel(error);
  }
}

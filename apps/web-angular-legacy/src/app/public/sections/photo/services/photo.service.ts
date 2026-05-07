import { Injectable } from '@angular/core';
import { ApiBooleanResponseModel, ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';

@Injectable({
  providedIn: 'root',
})
export class PhotoService {

  constructor(private httpSharedService: HttpSharedService) { }

  async create(photoCreateForm: FormData): Promise<ApiObjectResponseModel> {
    // POST: /photos
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>(`/photos`, photoCreateForm);
  }

  async get(memorialId: number, page: number, pgSize: number) {
    // GET: /photos/: memorialId
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/photos/${memorialId}?page=${page}&pgSize=${pgSize}`);
  }

  async getPhotos(objectType: string, objectId: number) {
    // GET: /photos/:objectType/:objectId
    return await this.httpSharedService.httpGet<ApiObjectResponseModel>(`/photos/${objectType}/${objectId}`);
  }

  async delete(photoId: string) {
    // DELETE: /photos
    return await this.httpSharedService.httpDelete<ApiObjectResponseModel>(`/photos`, {body: { photoIds: [photoId] } });
  }

  async update(photoUpdateForm: FormData) {
    // PUT: /photos
    return await this.httpSharedService.httpPut<ApiBooleanResponseModel>(`/photos`, photoUpdateForm);
  }

  async like(photoId: string): Promise<ApiObjectResponseModel> {
    // POST: /photo/:photoId/like
    return await this.httpSharedService.httpPut<ApiObjectResponseModel>(`/photo/${photoId}/like`, '');
  }

  async unlike(photoId: string): Promise<ApiObjectResponseModel> {
    // POST: /photo/:photoId/unlike
    return await this.httpSharedService.httpPut<ApiObjectResponseModel>(`/photo/${photoId}/unlike`, '');
  }
}

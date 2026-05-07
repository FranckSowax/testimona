import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { BiographyCreateModel } from '../models/biography-create.model';
import { BiographyModel } from '../models/biography.model';
import { BiographyService } from './biography.service';

@Injectable({
  providedIn: 'root',
})

export class BiographyDatastoreService {
  private _privateErrorBiographyDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorBiographyDatastore$ = this._privateErrorBiographyDatastore$.asObservable();

  constructor(private biographyService: BiographyService) { }

  async createBiography(
    biographyCreateModel: BiographyCreateModel,
    memorialId: number
  ): Promise<BiographyModel | null> {
    const createResult = await this.biographyService.create(biographyCreateModel, memorialId);

    if (!createResult.result.success) {
      this._privateErrorBiographyDatastore$.next(createResult.result.error);
      return Promise.resolve(null);
    }

    return Promise.resolve(
      new BiographyModel(
        createResult.data.id,
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ),
    );
  }

  getBiography(memorialId: number): Observable<BiographyModel | null> {
    return new Observable((newOb) => {
      this.biographyService.get(memorialId).then((biographyResult: ApiObjectResponseModel) => {
        if (!biographyResult.result.success) {
          this._privateErrorBiographyDatastore$.next(biographyResult.result.error);
          return newOb.next(null);
        }
        if (biographyResult.data == null) {
          return newOb.next(null)
        }
        return newOb.next(
          new BiographyModel(
            biographyResult.data.id,
            biographyResult.data.nicknames,
            biographyResult.data.homeCity,
            biographyResult.data.placesLived,
            biographyResult.data.religion,
            biographyResult.data.education,
            biographyResult.data.work,
            biographyResult.data.hobbies
          ),
        );
      })
    });
  }

  async editBiography(memorialId: number, biographyItem: BiographyCreateModel): Promise<boolean> {
    const editResult = await this.biographyService.update(memorialId, biographyItem);

    if (!editResult.result.success) {
      this._privateErrorBiographyDatastore$.next(editResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }
}


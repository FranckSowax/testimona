import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { CountryMemorialModel } from 'src/app/shared/models/country-memorial.model';
import { MemorialCreateModel } from '../models/memorial-create.model';
import { MemorialEditModel } from '../models/memorial-edit.model';
import { MemorialRequestAdminModel } from '../models/memorial-request-admin.model';
import { MemorialAdminModel, MemorialCurrentUserModel, MemorialModel } from '../models/memorial.model';
import { MemorialService } from './memorial.service';

@Injectable({
  providedIn: 'root',
})
export class MemorialDatastoreService {
  private _privateErrorMemorialDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorMemorialDatastore$ = this._privateErrorMemorialDatastore$.asObservable();

  constructor(private memorialService: MemorialService) {}

  async createMemorial(
    memorialModel: MemorialCreateModel,
  ): Promise<MemorialModel | null> {
    const createResult = await this.memorialService.create(memorialModel);

    if (!createResult.result.success) {
      this._privateErrorMemorialDatastore$.next(createResult.result.error);
      return Promise.resolve(null);
    }

    return Promise.resolve(
      new MemorialModel(
        createResult.data.id,
        createResult.data.url,
        '',
        '',
        0,
        0,
        0,
        '',
        null,
        0,
        0,
        0,
        '',
        null,
        '',
        '',
      ),
    );
  }

  getMemorial(memorialUrl: string): Observable<MemorialModel | null> {
    return new Observable((newOb) => {
      this.memorialService.get(memorialUrl).then((memorialResult: ApiObjectResponseModel) => {
        if (!memorialResult.result.success) {
          this._privateErrorMemorialDatastore$.next(memorialResult.result.error);
          return newOb.next(null);
        }

        return newOb.next(
          new MemorialModel(
            memorialResult.data.id,
            memorialResult.data.url,
            memorialResult.data.firstname,
            memorialResult.data.lastname,
            memorialResult.data.yearOfDeath,
            memorialResult.data.monthOfDeath,
            memorialResult.data.dayOfDeath,
            memorialResult.data.cityOfDeath,
            new CountryMemorialModel(memorialResult.data.countryOfDeath.id,memorialResult.data.countryOfDeath.code, memorialResult.data.countryOfDeath.flag),
            memorialResult.data.yearOfBirth,
            memorialResult.data.monthOfBirth,
            memorialResult.data.dayOfBirth,
            memorialResult.data.cityOfBirth,
            new CountryMemorialModel(memorialResult.data.countryOfBirth.id,memorialResult.data.countryOfBirth.code, memorialResult.data.countryOfBirth.flag),
            memorialResult.data.shortBiography,
            memorialResult.data.relationship,
          ),
        );
    })});

  }

  async editMemorial(memorialId: number, memorialItem: MemorialEditModel): Promise<boolean>  {
    const editResult = await this.memorialService.update(memorialId, memorialItem);

    if (!editResult.result.success) {
      this._privateErrorMemorialDatastore$.next(editResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }

  getMemorialAdminList(memorialUrl: string): Observable<MemorialAdminModel[] | null> {
    return new Observable((newOb) => {
      this.memorialService.getAdminList(memorialUrl).then((memorialAdminResult: ApiObjectResponseModel) => {
        if (!memorialAdminResult.result.success) {
          this._privateErrorMemorialDatastore$.next(memorialAdminResult.result.error);
          return newOb.next(null);
        }

        const returnArray = new Array<MemorialAdminModel>();
        memorialAdminResult.data.forEach((element: { identity: string; relationship: string; isAdmin: boolean; }) => {
          returnArray.push(new MemorialAdminModel(
            element.identity,
            element.relationship,
            element.isAdmin
          ))
        });
        return newOb.next(returnArray);
    })});
  }

  getMemorialUserRelationship(memorialId: number): Observable<MemorialCurrentUserModel | null> {
    return new Observable((newOb) => {
      this.memorialService.getUserRelationship(memorialId).then((memorialUserRelationshipResult: ApiObjectResponseModel) => {
        if (!memorialUserRelationshipResult.result.success) {
          this._privateErrorMemorialDatastore$.next(memorialUserRelationshipResult.result.error);
          return newOb.next(null);
        }

        return newOb.next(
          new MemorialCurrentUserModel(
            memorialUserRelationshipResult.data.relationship,
            memorialUserRelationshipResult.data.isAdmin,
          ),
        );
    })});
  }

  async sendRequestAdmin(memorialRequestAdminModel: MemorialRequestAdminModel): Promise<boolean | null> {
    const createResult = await this.memorialService.sendRequestAdmin(memorialRequestAdminModel);

    if (!createResult.result.success) {
      this._privateErrorMemorialDatastore$.next(createResult.result.error);
      return Promise.resolve(null);
    }

    return Promise.resolve(true)

  }
}

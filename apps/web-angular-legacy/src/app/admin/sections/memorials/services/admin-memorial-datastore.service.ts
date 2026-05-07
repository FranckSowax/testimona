import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { CountryMemorialModel } from 'src/app/shared/models/country-memorial.model';
import { AdminListMemorialModel, AdminMemorialModel } from '../models/admin-memorial.model';
import { AdminMemorialService } from './admin-memorial.service';

@Injectable({
  providedIn: 'root',
})
export class AdminMemorialDatastoreService {
  private _privateErrorMyMemorialsDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorMyMemorialsDatastore$ = this._privateErrorMyMemorialsDatastore$.asObservable();

  constructor(private myMemorialsService: AdminMemorialService) { }

  async getAdminMemorialsList(pg: number, pgSize: number): Promise<AdminListMemorialModel | null> {
    return this.myMemorialsService.getList(pg, pgSize).then((myMemorialsResult: ApiObjectResponseModel) => {
      if (!myMemorialsResult.result.success) {
        this._privateErrorMyMemorialsDatastore$.next(myMemorialsResult.result.error);
        return Promise.resolve(null);
      }

      const returnArray = new Array<AdminMemorialModel>();
      myMemorialsResult.data.memorialItems.forEach((element: { id: number, url: string; firstname: string; lastname: string; yearOfDeath: number, monthOfDeath: number, dayOfDeath: number, dateOfDeathName: string, countryOfDeath: CountryMemorialModel, countryOfDeathName: string, createdDate: string, modifiedDate: string, disabled: boolean }) => {
        returnArray.push(new AdminMemorialModel(
          element.id,
          element.url,
          element.firstname,
          element.lastname,
          element.yearOfDeath,
          element.monthOfDeath,
          element.dayOfDeath,
          '',
          element.countryOfDeath,
          '',
          element.createdDate,
          element.modifiedDate,
          element.disabled,
        ),
        )
      })
      return Promise.resolve({
        total: myMemorialsResult.data.total,
        memorialItems: returnArray
      });
    });
  }

}

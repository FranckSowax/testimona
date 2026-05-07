import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { CountryMemorialModel } from 'src/app/shared/models/country-memorial.model';
import { MyMemorialsModel } from '../models/my-memorials.model';
import { MyMemorialsService } from './my-memorials.service';

@Injectable({
  providedIn: 'root',
})
export class MyMemorialsDatastoreService {
  private _privateErrorMyMemorialsDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorMyMemorialsDatastore$ = this._privateErrorMyMemorialsDatastore$.asObservable();

  constructor(private myMemorialsService: MyMemorialsService) { }

  async getMyMemorialsList(): Promise<MyMemorialsModel[] | null> {
    return this.myMemorialsService.getList().then((myMemorialsResult: ApiObjectResponseModel) => {
      if (!myMemorialsResult.result.success) {
        this._privateErrorMyMemorialsDatastore$.next(myMemorialsResult.result.error);
        return Promise.resolve(null);
      }

      const returnArray = new Array<MyMemorialsModel>();
      myMemorialsResult.data.forEach((element: { url: string; firstname: string; lastname: string; yearOfDeath: number, countryOfDeath: CountryMemorialModel, countryOfDeathName: string, disabled: boolean }) => {
        returnArray.push(new MyMemorialsModel(
          element.url,
          element.firstname,
          element.lastname,
          element.yearOfDeath,
          element.countryOfDeath,
          '',
          element.disabled,
        ),
        )
      })
      return Promise.resolve(returnArray);
    });
  }

}

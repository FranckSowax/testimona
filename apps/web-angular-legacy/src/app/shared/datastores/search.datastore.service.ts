import { Injectable } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { MemorialSearchModel } from 'src/app/public/sections/testimona/models/memorial-search.model';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { CountryMemorialModel } from '../models/country-memorial.model';
import { MemorialSearchResultModel } from '../models/memorial-search.model';
import { SearchService } from '../services/search.service';

@Injectable({
  providedIn: 'root',
})
export class SearchDatastoreService {
  private _privateErrorSearchDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorSearchDatastore$ = this._privateErrorSearchDatastore$.asObservable();

  constructor(private searchService: SearchService) {}

  searchMemorial(memorialValueToSearch: Observable<string>, numberOfResult: number, countriesData: CountryMemorialModel[]): Observable<MemorialSearchResultModel[] | null> {
    return memorialValueToSearch.pipe(
      distinctUntilChanged()
      , debounceTime(400)
      , filter((value: string) => value.length >= 3)
      , switchMap((value: string) => this.searchService.searchMemorial(value, numberOfResult))
      , map((searchMemorialResult: ApiObjectResponseModel) => {
            if (!searchMemorialResult || !searchMemorialResult.result.success) {
              this._privateErrorSearchDatastore$.next(searchMemorialResult.result.error);
              return null;
            }

            const returnArray = new Array<MemorialSearchResultModel>();
            searchMemorialResult.data.forEach((element: { id: number, url: string; firstname: string; lastname: string; yearOfDeath: number; countryOfDeath: any; }) => {
              returnArray.push(new MemorialSearchResultModel(
                element.id,
                element.url,
                element.firstname,
                element.lastname,
                element.yearOfDeath,
                countriesData[element.countryOfDeath.id - 1].code,
              ))
            });
            return returnArray;
          })
        );
  }

  searchMemorialByCriteria(memorialToSearch: Observable<MemorialSearchModel>, numberOfResult: number, countriesData: CountryMemorialModel[]): Observable<MemorialSearchResultModel[] | null> {
    return memorialToSearch.pipe(
      distinctUntilChanged()
      , debounceTime(400)
      , filter((value: MemorialSearchModel) => {
        return value.firstname?.length >= 3 || value.firstname != "" || value.lastname != "" || value.lastname != null || value.firstname != null || value.lastname?.length >= 3 || value.yearOfDeath != "" || value.countryOfDeath != "" || value.yearOfDeath != null || value.countryOfDeath != null
      })
      , switchMap((value: MemorialSearchModel) => this.searchService.searchMemorialByCriteria(value.firstname, value.lastname, value.yearOfDeath, value.countryOfDeath, numberOfResult))
      , map((searchMemorialResult: ApiObjectResponseModel) => {
        if (!searchMemorialResult || !searchMemorialResult.result.success) {
          this._privateErrorSearchDatastore$.next(searchMemorialResult.result.error);
          return null;
        }

        const returnArray = new Array<MemorialSearchResultModel>();
        searchMemorialResult.data.forEach((element: { id: number, url: string; firstname: string; lastname: string; yearOfDeath: number; countryOfDeath: any; }) => {
          returnArray.push(new MemorialSearchResultModel(
            element.id,
            element.url,
            element.firstname,
            element.lastname,
            element.yearOfDeath,
            countriesData[element.countryOfDeath.id - 1].code,
          ))
        });
        return returnArray;
      })
    );
  }
}

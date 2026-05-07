import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { AuthenticationConfigurationModel } from '../models/authentication-configuration.model';
import { SecurityQuestionModel } from '../models/security-question.model';
import { ConfigurationService } from '../services/configuration.service';
import { forEach } from 'lodash-es';
import { TranslocoService } from '@ngneat/transloco';
import { CountryMemorialModel } from '../models/country-memorial.model';
import { MemorialConfigurationModel } from '../models/memorial-configuration.model';

class ApiSecurityQuestionModel {
    constructor(readonly id: number, readonly contentKey: string) {}
}

class ApiCountriesModel {
  constructor(readonly id: number, readonly code: string, readonly flag: string) {}
}

@Injectable({
  providedIn: 'root',
})
export class ConfigurationDatastoreService {
  private _privateErrorConfigurationDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorConfigurationDatastore$ = this._privateErrorConfigurationDatastore$.asObservable();

  constructor(private configurationService: ConfigurationService, private translocoService: TranslocoService) {}

  async registerConfiguration(): Promise<AuthenticationConfigurationModel | null> {
    const registerConfiguration = await this.configurationService.config();
    if (!registerConfiguration.result.success) {
      this._privateErrorConfigurationDatastore$.next(
        registerConfiguration.result.error,
      );
      return Promise.resolve(null);
    }

    const returnModel = new AuthenticationConfigurationModel(
      this.internalGetSecurityQuestions(registerConfiguration.data.securityQuestions),
    );

    return Promise.resolve(returnModel);
  }

  private internalGetSecurityQuestions(
    secuQuestions: Array<ApiSecurityQuestionModel>,
    ): Array<SecurityQuestionModel> {
    const returnArray = new Array<SecurityQuestionModel>();
    const translateData = this.translocoService.translateObject('securityQuestions');
    forEach(secuQuestions, (item: ApiSecurityQuestionModel) => {
        returnArray.push({
            id: item.id,
            content: translateData[item.contentKey]
        })
    });

    return returnArray;
  }

  async memorialConfiguration(currentLang: string): Promise<MemorialConfigurationModel | null> {
    const memorialConfiguration = await this.configurationService.memorialConfig();
    if (!memorialConfiguration.result.success) {
      this._privateErrorConfigurationDatastore$.next(
        memorialConfiguration.result.error,
      );
      return Promise.resolve(null);
    }

    const returnModel = new MemorialConfigurationModel(
      await this.getCountries(memorialConfiguration.data.countries, currentLang),
    );

    return Promise.resolve(returnModel);
  }

  private async getCountries(
    countries: Array<ApiCountriesModel>,
    currentLang: string
  ): Promise<Array<CountryMemorialModel>> {
    const returnArray = new Array<CountryMemorialModel>();
    const translateData = await this.translocoService.load(`countries/${currentLang}`).toPromise().then();
    forEach(countries, (item: ApiCountriesModel) => {
        returnArray.push({
            id: item.id,
            code: translateData[item.code],
            flag: item.flag,
        })
    });
    
    return returnArray;
  }

  async getSecurityQuestions(): Promise<Array<SecurityQuestionModel>> {
    const registerConfiguration = await this.configurationService.config();
    if (!registerConfiguration.result.success) {
      this._privateErrorConfigurationDatastore$.next(
        registerConfiguration.result.error,
      );
      return Promise.resolve([]);
    }

    return Promise.resolve(this.internalGetSecurityQuestions(registerConfiguration.data.securityQuestions));
  }
}

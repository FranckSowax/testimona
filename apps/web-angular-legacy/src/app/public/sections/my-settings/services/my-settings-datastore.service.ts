import { Injectable } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { SecurityQuestionModel } from 'src/app/shared/models/security-question.model';
import { AccountSecurityQuestionSaveModel, AccountUserModel, AccountUserSaveModel, LanguageModel } from '../models/my-settings.model';
import { MySettingsService } from './my-settings.service';
import { forEach } from 'lodash-es';
import * as cryptoJs from "crypto-js";
import { environment } from 'src/environments/environment';

class ApiSecurityQuestionModel {
  constructor(readonly questionId: number, readonly contentKey: string) {}
}

@Injectable({
  providedIn: 'root',
})

export class MySettingsDatastoreService {
  private _privateErrorMySettingsDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorMySettingsDatastore$ = this._privateErrorMySettingsDatastore$.asObservable();

  constructor(
    private mySettingsService: MySettingsService,
    private translocoService: TranslocoService,
    ) {}

  getUserInfo(): Observable<AccountUserModel | null> {
    return new Observable((newOb) => {
      this.mySettingsService.getUserInfo().then((userInfoResult: ApiObjectResponseModel) => {
        if (!userInfoResult.result.success) {
          this._privateErrorMySettingsDatastore$.next(userInfoResult.result.error);
          return newOb.next(null);
        }

        return newOb.next(
          new AccountUserModel(
            userInfoResult.data.userData.email,
            userInfoResult.data.userData.firstname,
            userInfoResult.data.userData.lastname,
            userInfoResult.data.userData.nickname,
            userInfoResult.data.userData.loginType,
            new LanguageModel(userInfoResult.data.userData.language.code),
            this.getSecurityQuestions(userInfoResult.data.questionsData)
            ),
        );
    })});

  }


  private getSecurityQuestions(
    secuQuestions: Array<ApiSecurityQuestionModel>,
    ): Array<SecurityQuestionModel> {
    const returnArray = new Array<SecurityQuestionModel>();
    const translateData = this.translocoService.translateObject('securityQuestions');
    forEach(secuQuestions, (item: ApiSecurityQuestionModel) => {
        returnArray.push({
            id: item.questionId,
            content: translateData[item.contentKey]
        })
    });

    return returnArray;
  }

  async saveUserInfo(userInfoItem: AccountUserSaveModel): Promise<boolean> {
    const editResult = await this.mySettingsService.updateUserInfo(userInfoItem);
    return Promise.resolve(editResult.result.success);
  }

  async saveSecurityQuestionInfo(securityQuestionInfoItem: AccountSecurityQuestionSaveModel[]): Promise<boolean> {
    securityQuestionInfoItem.forEach((securityQuestion) => {
      securityQuestion.answer = cryptoJs.AES.encrypt(securityQuestion.answer.trim(), environment.publicKey).toString();
    })

    const editResult = await this.mySettingsService.updateAnswerInfo(securityQuestionInfoItem);
    return Promise.resolve(editResult.result.success);
  }
}

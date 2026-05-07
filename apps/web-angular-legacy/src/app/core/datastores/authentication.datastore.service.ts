import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import * as cryptoJs from "crypto-js";
import { BehaviorSubject } from 'rxjs';
import { ProfileInfosModel } from 'src/app/shared/models/profile-infos.model';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { AuthenticationService } from '../services/authentication.service';
import { RegisterModel } from '../models/register.model';
import { AuthenticationTypeEnum } from 'src/app/shared/enums/auth-type.enum';
// import { SocialAuthService } from '@abacritt/angularx-social-login';
import { StorageService } from 'src/app/shared/services/storage.service';
import { Constantes } from 'src/app/shared/constantes/constante';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationDataStoreService {

  private _privateErrorAuthDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorAuthDatastore$ = this._privateErrorAuthDatastore$.asObservable();

  constructor(private authenticationService: AuthenticationService, /*private socialAuthService: SocialAuthService,*/ private storageService: StorageService) { }

  resetDataStore(): void {
    this._privateErrorAuthDatastore$.next(ApiResultResponseEnum.NoError);
  }

  private encryptPassword(password: string) {
    return cryptoJs.AES.encrypt(
      password.trim(),
      environment.publicKey
    ).toString();
  }

  private encryptAnswer(answer: string) {
    return cryptoJs.AES.encrypt(
      answer.trim(),
      environment.publicKey
    ).toString();
  }

  async register(): Promise<void> {
    const returnValue = await this.authenticationService.register();
    if (returnValue.result.success == false) {
      throw 'not able to register';
    }
  }

  async signup(registerModel: RegisterModel): Promise<ProfileInfosModel | null> {
    // Encrypt data that requires it
    registerModel.password = this.encryptPassword(registerModel.password);
    registerModel.answers[0].answer = this.encryptAnswer(registerModel.answers[0].answer);
    registerModel.answers[1].answer = this.encryptAnswer(registerModel.answers[1].answer);

    const newUserResult = await this.authenticationService.signup(registerModel);
    if (!newUserResult.result.success) {
      this._privateErrorAuthDatastore$.next(newUserResult.result.error);
      return Promise.resolve(null);
    }

    // save login type in local storage
    this.storageService.addLocalStorage(Constantes.LoginTypeStorage, registerModel.loginType);

    return Promise.resolve(
      new ProfileInfosModel(
        newUserResult.data.userId,
        newUserResult.data.firstname,
        newUserResult.data.lastname,
        newUserResult.data.nickname,
        newUserResult.data.displayName,
        newUserResult.data.role,
        registerModel.loginType,
        newUserResult.data.language,
      ),
    );
  }

  async authSite(email: string, password: string): Promise<ProfileInfosModel | null> {
    const apiResult = await this.authenticationService.authSite(email, this.encryptPassword(password));
    if (!apiResult.result.success) {
      this._privateErrorAuthDatastore$.next(apiResult.result.error);
      return Promise.resolve(null);
    }

    // save login type in local storage
    this.storageService.addLocalStorage(Constantes.LoginTypeStorage, AuthenticationTypeEnum.Site);

    return Promise.resolve(
      new ProfileInfosModel(
        apiResult.data.userId,
        apiResult.data.firstname,
        apiResult.data.lastname,
        apiResult.data.nickname,
        apiResult.data.displayName,
        apiResult.data.role,
        AuthenticationTypeEnum.Site,
        apiResult.data.language,
      ),
    );
  }

  async autoLogin(loginType: AuthenticationTypeEnum): Promise<ProfileInfosModel | null> {
    const newUserResult = await this.authenticationService.autoLogin();
    if (!newUserResult.result.success) {
      this._privateErrorAuthDatastore$.next(newUserResult.result.error);
      return Promise.resolve(null);
    }

    return Promise.resolve(
      new ProfileInfosModel(
        newUserResult.data.userId,
        newUserResult.data.firstname,
        newUserResult.data.lastname,
        newUserResult.data.nickname,
        newUserResult.data.displayName,
        newUserResult.data.role,
        loginType,
        newUserResult.data.language,
      ),
    );
  }

  async checkEmailUnicity(email: string): Promise<boolean> {
    const returnValue = await this.authenticationService.checkEmailUnicity(email);
    if (returnValue.result.success == false) {
      return Promise.resolve(false);
    }
    return Promise.resolve(returnValue.data);
  }

  async signout(signoutType: AuthenticationTypeEnum): Promise<boolean> {
    this.storageService.removeLocalStorage(Constantes.LoginTypeStorage);
    const returnValue = await this.authenticationService.signout();
    if (returnValue.result.success == false) {
      return Promise.resolve(false);
    }

    this.storageService.removeLocalStorage(Constantes.LoginTypeStorage);
    // if (signoutType == AuthenticationTypeEnum.Google) {
    //   this.socialAuthService.signOut(true);
    // }

    return Promise.resolve(returnValue.data);
  }

  // async signoutSocialMedia(signoutType: AuthenticationTypeEnum): Promise<boolean> {
  //   try {
  //     this.storageService.removeLocalStorage(Constantes.LoginTypeStorage);
  //     if (signoutType != AuthenticationTypeEnum.Site) {
  //       await this.socialAuthService.signOut(true);
  //     }
  //     return Promise.resolve(true);
  //   } catch (error) {
  //     console.log(error);
  //     return Promise.resolve(true);
  //   }
  // }
}

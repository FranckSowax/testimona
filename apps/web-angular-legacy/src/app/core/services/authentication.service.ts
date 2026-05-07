import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthenticationTypeEnum } from 'src/app/shared/enums/auth-type.enum';
import { ApiBooleanResponseModel, ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { ConfigurationService } from 'src/app/shared/services/configuration.service';
import { HttpSharedService } from 'src/app/shared/services/http-shared.service';
import { RegisterSocialMediaModel } from '../models/register-social-media.model';
import { RegisterModel } from '../models/register.model';
import { UserSocialMediaModel } from '../models/user-social-media.model';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  private _apiUrl: string;

  constructor(
    private configurationService: ConfigurationService,
    private httpSharedService: HttpSharedService,
  ) {
    this._apiUrl = this.configurationService.apiUrl;
  }

  async register(): Promise<ApiBooleanResponseModel> {
    // GET: /register
    return await this.httpSharedService.httpGet<ApiBooleanResponseModel>('/register');
  }

  async signup(registerModel: RegisterModel): Promise<ApiObjectResponseModel> { 
    // POST: /register
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>('/register', registerModel);
  }

  async checkEmailUnicity(email: string): Promise<ApiBooleanResponseModel> {
    // POST: /register/emailexists`;
    return await this.httpSharedService.httpPost<ApiBooleanResponseModel>('/register/emailexists', { email: email });
  }

  async authSite(email: string, password: string): Promise<ApiObjectResponseModel> {
    // POST: /auth
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>('/auth', { email: email, password: password, loginType: AuthenticationTypeEnum.Site });
  }

  async autoLogin(): Promise<ApiObjectResponseModel> {
    // POST: /auth/relogin
    return await this.httpSharedService.httpPost<ApiObjectResponseModel>('/auth/relogin', { });
  }

  async signout(): Promise<ApiBooleanResponseModel> {
    // POST: /signout
    return await this.httpSharedService.httpPost<ApiBooleanResponseModel>('/signout', { });
  }

  // async authSocialMedia(registerSocialMediaModel: RegisterSocialMediaModel): Promise<ApiObjectResponseModel> {
  //   // POST: /auth/social
  //   const url = `${this._apiUrl}/auth/social`;
  //   return await this.httpSharedService.httpPost<ApiBooleanResponseModel>('/auth/social', registerSocialMediaModel);
  // }
}

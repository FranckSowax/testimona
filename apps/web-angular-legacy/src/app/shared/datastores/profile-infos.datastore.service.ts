import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthenticationTypeEnum } from 'src/app/shared/enums/auth-type.enum';
import { DisplayProfileIdentityEnum } from '../enums/display-profile-identity.enum';
import { UserRoleEnum } from '../enums/user-role.enum';
import { ProfileInfosModel } from '../models/profile-infos.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileInfosService {
  private _profileInfos: ProfileInfosModel;

  private _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  IsLoggedIn$(): BehaviorSubject<boolean> {
    return this._isLoggedIn$;
  }

  constructor() {
    this._isLoggedIn$.next(false);
    this._profileInfos = this.reinitializeProfileInfosModel();
  }

  authenticateCurrentUser(
    userId: string,
    firstname: string,
    lastname: string,
    nickname: string,
    displayName: DisplayProfileIdentityEnum,
    userRole: UserRoleEnum,
    loginType: AuthenticationTypeEnum,
    language: string
  ) {
    this._profileInfos = new ProfileInfosModel(
      userId,
      firstname,
      lastname,
      nickname,
      displayName,
      userRole,
      loginType,
      language
    );

    this._isLoggedIn$.next(true);
  }

  signoutCurrentUser() {
    this._isLoggedIn$.next(false);
    this._profileInfos = this.reinitializeProfileInfosModel();
  }

  userIsAdmin(): boolean {
    if (!this._isLoggedIn$.getValue()) return false;

    return this._profileInfos.role == UserRoleEnum.admin;
  }

  getCurrentUserInfos(): ProfileInfosModel {
    return this._profileInfos;
  }

  getCurrentUserLoginType(): AuthenticationTypeEnum {
    return this._profileInfos.loginType;
  }

  getCurrentUserLanguage(): string {
    return this._profileInfos.language;
  }

  private reinitializeProfileInfosModel(): ProfileInfosModel {
    return new ProfileInfosModel(
      '',
      '',
      '',
      '',
      DisplayProfileIdentityEnum.nickname,
      UserRoleEnum.user,
      AuthenticationTypeEnum.Site,
      'en'
    );
  }
}

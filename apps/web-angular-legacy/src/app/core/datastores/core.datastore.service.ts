import { Injectable } from '@angular/core';
// import { SocialUser } from '@abacritt/angularx-social-login';
import { RegisterSocialMediaModel } from '../models/register-social-media.model';
import { AuthenticationTypeEnum } from 'src/app/shared/enums/auth-type.enum';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { AuthenticationService } from '../services/authentication.service';
import { Constantes } from 'src/app/shared/constantes/constante';
import { StorageService } from 'src/app/shared/services/storage.service';
import { UserRoleEnum } from 'src/app/shared/enums/user-role.enum';

@Injectable({
  providedIn: 'root',
})
export class CoreDataStoreService {
  constructor(
    private authenticationService: AuthenticationService,
    private profileInfoService: ProfileInfosService,
    private storageService: StorageService
  ) {}

  // async loggedSocialMedia(
  //   loginType: AuthenticationTypeEnum,
  //   userInfos: SocialUser,
  //   language: string
  // ): Promise<void> {
  //   switch (loginType) {
  //     case AuthenticationTypeEnum.Google:
  //       await this.loggedByGoogle(userInfos, language);
  //       break;
  //     default:
  //       break;
  //   }
  // }

  // private async loggedByGoogle(googleUserInfos: SocialUser, language: string) {
  //   await this.createOrLogUserBySocialMedia({
  //     id_token: googleUserInfos.idToken,
  //     id: googleUserInfos.id,
  //     language: language,
  //     loginType: AuthenticationTypeEnum.Google,
  //   });
  // }

  // private async createOrLogUserBySocialMedia(
  //   registerSocialMediaModel: RegisterSocialMediaModel,
  // ) {
  //   const returnValue = await this.authenticationService.authSocialMedia(
  //     registerSocialMediaModel,
  //   );

  //   if (!returnValue.result.success) return;

  //   // save login type in local storage
  //   this.storageService.addLocalStorage(Constantes.LoginTypeStorage, AuthenticationTypeEnum.SocialMedia);

  //   this.profileInfoService.authenticateCurrentUser(
  //     returnValue.data.userId,
  //     returnValue.data.firstname,
  //     returnValue.data.lastname,
  //     returnValue.data.nickname,
  //     returnValue.data.displayName,
  //     returnValue.data.role as UserRoleEnum,
  //     AuthenticationTypeEnum.Google,
  //     returnValue.data.language,
  //   );
  // }
}

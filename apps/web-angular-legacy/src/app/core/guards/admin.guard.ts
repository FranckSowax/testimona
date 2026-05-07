import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Constantes } from 'src/app/shared/constantes/constante';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { AuthenticationTypeEnum } from 'src/app/shared/enums/auth-type.enum';
import { StorageService } from 'src/app/shared/services/storage.service';
import { AuthenticationDataStoreService } from '../datastores/authentication.datastore.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private router: Router,
      private profileInfosService: ProfileInfosService,
      private authenticationDataStoreService: AuthenticationDataStoreService,
      private storageService: StorageService
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
      return new Promise(async (resolve, reject) => {
        if (this.profileInfosService.IsLoggedIn$().getValue()) {
          return resolve(this.profileInfosService.userIsAdmin());
        }

        if (this.storageService.getLocalStorage(Constantes.LoginTypeStorage) == AuthenticationTypeEnum.Site) {
          const currentUser = await this.authenticationDataStoreService.autoLogin(AuthenticationTypeEnum.Site);

          if (currentUser) {
            this.profileInfosService.authenticateCurrentUser(
              currentUser.userId,
              currentUser.firstname,
              currentUser.lastname,
              currentUser.nickname,
              currentUser.displayName,
              currentUser.role,
              currentUser.loginType,
              currentUser.language,
            );
            return resolve(this.profileInfosService.userIsAdmin());
          }
        }

        this.router.navigate(["/"]);
        return resolve(false);
      });
  }
}

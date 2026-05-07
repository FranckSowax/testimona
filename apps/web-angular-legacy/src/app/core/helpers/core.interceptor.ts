import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, EMPTY, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { AuthenticationDataStoreService } from '../datastores/authentication.datastore.service';

@Injectable()
export class CoreInterceptor implements HttpInterceptor {
  constructor(
    private authenticationDataStoreService: AuthenticationDataStoreService,
    private profileInfosService: ProfileInfosService,
    private router: Router,
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next
      .handle(
        request.clone({
          withCredentials: true,
          responseType: 'json',
        }),
      )
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (request.url.includes('signout')) {
            this.profileInfosService.signoutCurrentUser();
            return throwError(() => err);
          }

          switch (err.status) {
            case 401:
              return this.handle401Error();
            default:
              return throwError(() => err);
          }
        }),
      );
  }

  private handle401Error(): Observable<HttpEvent<any>> {
    try {
      this.authenticationDataStoreService
        .signout(this.profileInfosService.getCurrentUserLoginType())
        .then();
      this.profileInfosService.signoutCurrentUser();
      this.router.navigate(['/']);
      return EMPTY;
    } catch {
      return throwError(() => new Error('Not Authorized'));
    }
  }
}

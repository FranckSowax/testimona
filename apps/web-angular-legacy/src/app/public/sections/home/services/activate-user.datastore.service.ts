import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ActivateUserService } from './activate-user.service';

@Injectable({
  providedIn: 'root'
})
export class ActivateUserDatastoreService {
  private _privateErrorActivateUserDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorActivateUserDatastore$ = this._privateErrorActivateUserDatastore$.asObservable();

  constructor(private activateUserService: ActivateUserService) { }

  async activateUser(userId: string): Promise<boolean> {
    const activationResult = await this.activateUserService.activateUser(userId);

    if (!activationResult .result.success) {
      this._privateErrorActivateUserDatastore$.next(activationResult .result.error);
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }
}

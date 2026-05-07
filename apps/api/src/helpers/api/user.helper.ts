import { DisplayName } from '@prisma/client';
import { UserIdentityModel, UserServiceModel } from '../../models/_.models';

export class UserHelpers {
  static getStringNameToDisplay(userInfos: UserServiceModel | UserIdentityModel | undefined) {
    if (userInfos == undefined) return 'unknow';

    let identityData = '';
    if (userInfos.displayName == DisplayName.Nickname) {
      identityData = userInfos.nickname;
    } else if (userInfos.displayName == DisplayName.FirstnameLastname) {
      identityData = `${userInfos.firstname} ${userInfos.lastname}`;
    } else if (userInfos.displayName == DisplayName.NicknameFirstnameLastname) {
      identityData = `${userInfos.nickname} (${userInfos.firstname} ${userInfos.lastname})`;
    }

    return identityData;
  }
}

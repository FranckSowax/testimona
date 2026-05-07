import { AuthenticationTypeEnum } from '../enums/auth-type.enum';
import { DisplayProfileIdentityEnum } from '../enums/display-profile-identity.enum';
import { UserRoleEnum } from '../enums/user-role.enum';

export class ProfileInfosModel {
  constructor(
    readonly userId: string,
    readonly firstname: string,
    readonly lastname: string,
    readonly nickname: string,
    readonly displayName: DisplayProfileIdentityEnum,
    readonly role: UserRoleEnum,
    readonly loginType: AuthenticationTypeEnum,
    readonly language: string,
  ) {}
}

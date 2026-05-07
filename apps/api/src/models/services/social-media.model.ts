import { AuthenticationMode } from '.prisma/client';

export class SocialUserModel {
  constructor(
    readonly socialMediaUserId: string,
    readonly email: string | undefined,
    readonly firstname: string | undefined,
    readonly lastname: string | undefined,
    readonly nickname: string | undefined,
    readonly language: string | undefined,
    readonly loginType: AuthenticationMode,
    readonly dataLoginFromOther: DataLoginFromOtherModel,
  ) {}
}

class DataLoginFromOtherModel {
  constructor(readonly picture: string | undefined) {}
}

export class FacebookDataModel {
  constructor(readonly accessToken: string, readonly language: string) {}
}

export class GoogleDataModel {
  constructor(readonly accessToken: string, readonly idToken: string) {}
}

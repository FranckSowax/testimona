import { AuthenticationTypeEnum } from "src/app/shared/enums/auth-type.enum";

export class RegisterSocialMediaModel {
    constructor(
        readonly id_token: string,
        readonly id: string,
        readonly language: string,
        readonly loginType: AuthenticationTypeEnum,
        readonly access_token?: string) { }
  }
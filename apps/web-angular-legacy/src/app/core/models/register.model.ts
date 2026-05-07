import { DisplayProfileIdentityEnum } from "src/app/shared/enums/display-profile-identity.enum";
import { UserRoleEnum } from "src/app/shared/enums/user-role.enum";
import { AuthenticationTypeEnum } from "../../shared/enums/auth-type.enum";
import { RegisterSecurityQuestionModel } from "./register-security-question.model";

export class RegisterModel {
    constructor(
        readonly firstname: string,
        readonly lastname: string,
        readonly nickname: string,
        readonly email: string,
        public password: string,
        readonly displayName: DisplayProfileIdentityEnum,
        readonly answers: RegisterSecurityQuestionModel[],
        readonly role: UserRoleEnum,
        readonly loginType: AuthenticationTypeEnum,
        readonly language: string) { }
  }
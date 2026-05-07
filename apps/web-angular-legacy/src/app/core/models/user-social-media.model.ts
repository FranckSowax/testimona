import { DisplayProfileIdentityEnum } from "src/app/shared/enums/display-profile-identity.enum";
import { UserRoleEnum } from "src/app/shared/enums/user-role.enum";

export class UserSocialMediaModel {
    constructor(
        readonly firstname: string,
        readonly lastname: string,
        readonly nickname: string,
        readonly displayName: DisplayProfileIdentityEnum,
        readonly role: UserRoleEnum,
        readonly language: string
    ) {}
}
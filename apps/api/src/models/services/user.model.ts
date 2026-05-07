import { DisplayName, UserRole } from ".prisma/client";
import { AuthenticationMode } from "@prisma/client";
import { PhotoUrlResponseModel } from "../responses/photo.model";

export class UserIdentityModel {
  constructor(
    readonly userId: string,
    readonly firstname: string,
    readonly lastname: string,
    readonly nickname: string,
    readonly displayName: DisplayName,
    readonly photos: Array<PhotoUrlResponseModel> | undefined
  ) {}
}

export class UserServiceModel {
  constructor(
    readonly userId: string,
    readonly email: string,
    readonly password: string,
    readonly firstname: string,
    readonly lastname: string,
    readonly nickname: string,
    readonly displayName: DisplayName,
    readonly role: UserRole,
    readonly loginType: AuthenticationMode,
    readonly language: { readonly code: string },
    readonly photos: Array<PhotoUrlResponseModel> | undefined
  ) {}
}

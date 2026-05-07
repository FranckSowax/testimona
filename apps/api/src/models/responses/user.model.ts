import { AuthenticationMode, DisplayName } from "@prisma/client";
import { PhotoUrlResponseModel } from "./photo.model";

export class UserResponseModel {
    constructor(
      readonly email: string,
      readonly firstname: string,
      readonly lastname: string,
      readonly nickname: string,
      readonly loginType: AuthenticationMode,
      readonly language: { readonly code: string },
      readonly photos: Array<PhotoUrlResponseModel> | undefined
    ) {}
  }
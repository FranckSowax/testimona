import { CountryMemorialModel } from "src/app/shared/models/country-memorial.model";
import { UserInfoModel } from "src/app/shared/models/user-info.model"

export class MemorialCreateModel {
  constructor(
    readonly firstname: string,
    readonly lastname: string,
    readonly yearOfDeath: number,
    readonly monthOfDeath: number,
    readonly dayOfDeath: number,
    readonly cityOfDeath: string,
    readonly countryOfDeath: string,
    readonly shortBiography: string,
    readonly relative: string,
    readonly isAdmin: boolean,
  ) { }
}

export class MemorialModel {
  constructor(
    readonly id: number,
    readonly url: string,
    readonly firstname: string,
    readonly lastname: string,
    readonly yearOfDeath: number,
    readonly monthOfDeath: number,
    readonly dayOfDeath: number,
    readonly cityOfDeath: string,
    readonly countryOfDeath: CountryMemorialModel,
    readonly yearOfBirth: number,
    readonly monthOfBirth: number,
    readonly dayOfBirth: number,
    readonly cityOfBirth: string,
    readonly countryOfBirth: CountryMemorialModel,
    readonly shortBiography: string,
    readonly relative: string,
  ) { }
}

export class MemorialMinimalModel {
  constructor(
    readonly id: number,
    readonly url: string,
    readonly firstname: string,
    readonly lastname: string,
  ) {}
}

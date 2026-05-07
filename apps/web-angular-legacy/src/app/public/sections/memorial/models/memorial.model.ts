import { CountryMemorialModel } from "src/app/shared/models/country-memorial.model";

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
  ) {}
}

export class MemorialAdminModel {
  constructor(
      readonly identity: string,
      readonly relationship: string,
      readonly isAdmin: boolean
  ) {}
}

export class MemorialCurrentUserModel {
  constructor(
    readonly relationship: string,
    readonly isAdmin: boolean,
  ) {}
}
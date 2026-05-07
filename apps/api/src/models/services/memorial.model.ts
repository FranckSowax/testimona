import { Relative } from ".prisma/client";

//#region Admin
export class AdminListMemorialModel {
  constructor(
    readonly total: number,
    readonly memorialItems: AdminMemorialModel[]
  ) {}
}

export class AdminMemorialModel {
  constructor(
    readonly id: number,
    readonly url: string,
    readonly firstname: string,
    readonly lastname: string,
    readonly yearOfDeath: number,
    readonly monthOfDeath: number,
    readonly dayOfDeath: number,
    readonly countryOfDeath: {
      readonly id: number;
      readonly code: string;
      readonly flag: string;
    },
    readonly createdDate: Date,
    readonly modifiedDate: Date,
    readonly disabled: boolean
  ) {}
}
//#endregion

//#region Public
export class MemorialCreateModel {
  constructor(readonly id: number, readonly url: string) {}
}

export class MemorialModel {
  constructor(
    readonly id: number,
    readonly url: string,
    readonly firstname: string,
    readonly lastname: string,
    readonly yearOfBirth: number,
    readonly monthOfBirth: number,
    readonly dayOfBirth: number,
    readonly countryOfBirth: {
      readonly id: number;
      readonly code: string;
      readonly flag: string;
    },
    readonly cityOfBirth: string,
    readonly yearOfDeath: number,
    readonly monthOfDeath: number,
    readonly dayOfDeath: number,
    readonly countryOfDeath: {
      readonly id: number;
      readonly code: string;
      readonly flag: string;
    },
    readonly cityOfDeath: string,
    readonly shortBiography: string,
    public relationship: Relative
  ) {}
}

export class MemorialSearchModel {
  constructor(
    readonly id: number,
    readonly url: string,
    readonly firstname: string,
    readonly lastname: string,
    readonly yearOfDeath: number,
    readonly countryOfDeath: {
      readonly id: number;
      readonly code: string;
      readonly flag: string;
    },
  ) {}
}

export class MyMemorialModel {
  constructor(
    readonly url: string,
    readonly firstname: string,
    readonly lastname: string,
    readonly yearOfDeath: number,
    readonly countryOfDeath: {
      readonly id: number;
      readonly code: string;
      readonly flag: string;
    },
    readonly disabled: boolean
  ) {}
} 
//#endregion

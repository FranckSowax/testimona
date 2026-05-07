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
    ) {}
  }
export class MemorialEditModel {
    constructor(
      readonly firstname: string,
      readonly lastname: string,
      readonly yearOfBirth: number,
      readonly monthOfBirth: number,
      readonly dayOfBirth: number,
      readonly countryOfBirth: string,
      readonly cityOfBirth: string,
      readonly yearOfDeath: number,
      readonly monthOfDeath: number,
      readonly dayOfDeath: number,
      readonly countryOfDeath: string,
      readonly cityOfDeath: string,
      readonly shortBiography: string
    ) {}
  }
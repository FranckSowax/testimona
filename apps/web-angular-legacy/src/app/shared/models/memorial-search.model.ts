export class MemorialSearchResultModel {
    constructor(
      readonly id: number,
      readonly url: string,
      readonly firstname: string,
      readonly lastname: string,
      readonly yearOfDeath: number,
      readonly countryOfDeath: string,
    ) {}
  }

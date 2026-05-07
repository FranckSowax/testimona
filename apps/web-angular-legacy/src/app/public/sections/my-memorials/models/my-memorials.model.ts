import { CountryMemorialModel } from "src/app/shared/models/country-memorial.model";

export class MyMemorialsModel {
  constructor(
    readonly url: string,
    readonly firstname: string,
    readonly lastname: string,
    readonly yearOfDeath: number,
    readonly countryOfDeath: CountryMemorialModel,
    public countryOfDeathName: string,
    readonly disabled: boolean
  ) { }
}

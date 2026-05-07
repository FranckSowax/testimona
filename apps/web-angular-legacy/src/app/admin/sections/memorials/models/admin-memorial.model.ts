import { CountryMemorialModel } from "src/app/shared/models/country-memorial.model";

export class AdminListMemorialModel {
  constructor(
    readonly total: number,
    readonly memorialItems: AdminMemorialModel[]
  ) { }
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
    public dateOfDeathName: string,
    readonly countryOfDeath: CountryMemorialModel,
    public countryOfDeathName: string,
    public createdDate: string,
    public modifiedDate: string,
    readonly disabled: boolean
  ) { }
}

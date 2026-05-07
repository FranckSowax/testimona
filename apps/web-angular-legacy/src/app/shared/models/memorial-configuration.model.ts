import { CountryMemorialModel } from "./country-memorial.model";

export class MemorialConfigurationModel {
    constructor(
    readonly countries: Array<CountryMemorialModel>) {}
}
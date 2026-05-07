export class CountryModel {
  constructor(
    readonly id: number,
    readonly code: string,
    readonly name: string,
    readonly flag: string,
  ) {}
}

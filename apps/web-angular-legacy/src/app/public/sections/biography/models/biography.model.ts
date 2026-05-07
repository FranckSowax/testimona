export class BiographyModel {
  constructor(
    readonly id: number,
    readonly nicknames: string,
    readonly homeCity: string,
    readonly placesLived: string,
    readonly religion: string,
    readonly education: string,
    readonly work: string,
    readonly hobbies: string,
  ) { }
}

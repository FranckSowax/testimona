import { StringHelpers } from '../_.helpers';

const delimiter = '-';

export class MemorialHelpers {
  static prepareUrl(
    firstname: string,
    lastname: string,
    yearOfDeath: number,
    numberOfOccurrence: number,
  ): string {
    let firstnameClean = StringHelpers.removeAccent(firstname.trim());
    let lastnameClean = StringHelpers.removeAccent(lastname.trim());

    let urlFormatted = StringHelpers.concat(
      [
        firstnameClean,
        lastnameClean,
        yearOfDeath.toString(),
        numberOfOccurrence > 0 ? numberOfOccurrence.toString() : '',
      ],
      delimiter,
    ).toLocaleLowerCase();
    urlFormatted = StringHelpers.replaceAll(urlFormatted, ' ', '');
    urlFormatted = StringHelpers.replaceAll(urlFormatted, "'", '');

    return urlFormatted;
  }

  static compareUrl(
    currentMemorialUrl: string,
    firstname: string,
    lastname: string,
    yearOfDeath: number,
  ): boolean {
    const newMemorialUrl = MemorialHelpers.prepareUrl(
      firstname,
      lastname,
      yearOfDeath,
      0,
    ).toLowerCase();

    return currentMemorialUrl.toLowerCase().startsWith(newMemorialUrl);
  }
}

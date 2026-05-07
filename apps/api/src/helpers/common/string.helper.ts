import { isUndefined, filter } from 'lodash';

export class StringHelpers {
  static concat(
    valuesToAdd: (string | undefined)[],
    delimiter: string,
  ): string {
    if (isUndefined(valuesToAdd)) return '';
    if (isUndefined(valuesToAdd.length == 0)) return '';

    const valuesWithNoUndefined = filter(valuesToAdd, ((ite) => { return !isUndefined(ite) && ite != ''; }));
    if (isUndefined(valuesWithNoUndefined.length == 0)) return '';

    return valuesWithNoUndefined.join(delimiter);
  }

  static replaceAll(string: string, search: string, replace: string): string {
    return string.split(search).join(replace);
  }

  static removeAccent(string: string): string {
    const removeAccent = require('remove-accents');
    return removeAccent(string);
  }
}

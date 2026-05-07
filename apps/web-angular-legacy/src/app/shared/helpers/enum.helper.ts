import { KeyValuePairModel } from "../models/key-value-pair.model";

export class EnumHelpers {
  static getEnumDropDownList(enumType: any, translations: any): Array<KeyValuePairModel> {
    let values: any = Object.keys(enumType)
      .filter((x) => !(parseInt(x, 10) >= 0))
      .map((key) => {
        return { key: enumType[key], value: translations[key] };
      });
    return values;
  }

  static getEnumKeyValue(enumType: any, value: string): number {
    let values: string[] = Object.keys(enumType).filter((x) => !(parseInt(x, 10) >= 0));
    return values.findIndex((val) => val == value);
  }

  static getEnumKeyByEnumValue<T extends {[index:string]:string}>(myEnum:T, enumValue:string): keyof T|null {
    let keys = Object.keys(myEnum).filter(x => myEnum[x] == enumValue);
    return keys.length > 0 ? keys[0] : null;
  }
}
import { ListSortOrderEnum } from "../enums/list-sort-order.enum";
import { KeyValuePairModel } from "../models/key-value-pair.model";
import * as _ from "lodash-es";

export class DateHelpers {
  static getNumberDropDownList(from: number, end: number, sortOrder: ListSortOrderEnum, addZero: boolean = false, interval: number = 1): Array<KeyValuePairModel> {
    let numberListData = new Array<KeyValuePairModel>();
    for (let i = from; i <= end; i = i + interval) {
        numberListData.push(new KeyValuePairModel(i.toString(), addZero ? this.addZero(i) : i.toString()));
    }

    if (sortOrder == ListSortOrderEnum.descending) {
        return _.orderBy(numberListData, ['key'], ['desc']);
    }

    return numberListData;
  }

  static getHourDropDownList(from: number, end: number, sortOrder: ListSortOrderEnum, addZero: boolean = false, interval: number = 1, format24h: boolean = false): Array<KeyValuePairModel> {
    let numberListData = new Array<KeyValuePairModel>();
    for (let i = from; i <= end; i = i + interval) {
      if (format24h) {
        numberListData.push(new KeyValuePairModel(addZero ? this.addZero(i) : i.toString(), addZero ? this.addZero(i) : i.toString()));
      } else {
        let hour = 0;
        let period = '';
        if (i < 12) {
          hour = (i == 0) ? 12 : i;
          period = 'AM';
        } else {
          hour = (i == 12) ? 12 : i - 12;
          period = 'PM';
        }

        numberListData.push(new KeyValuePairModel(addZero ? `${this.addZero(hour)} ${period}` : `${hour.toString()} ${period}`, addZero ? `${this.addZero(hour)} ${period}` : `${hour.toString()} ${period}`));  
      }
    }

    if (sortOrder == ListSortOrderEnum.descending) {
        return _.orderBy(numberListData, ['key'], ['desc']);
    }

    return numberListData;
  }

  static addZero(data: number): string {
    return data < 10 ? '0' + data : data.toString();
  }
}
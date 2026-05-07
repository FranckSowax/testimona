export class UserInfoModel {
  constructor(
    readonly userId: string,
    readonly identity: string,
    readonly relathionship: string,
  ) { }
}

export class UserInfoModelPhoto {
  constructor(
    readonly identity: string,
    readonly userId: string,
  ) { }
}

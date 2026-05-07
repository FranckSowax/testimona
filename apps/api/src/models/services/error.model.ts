export class ErrorServiceModel {
  constructor(
    readonly serviceName: string,
    readonly serviceMethod: string,
    readonly methodParams: {},
  ) {}
}

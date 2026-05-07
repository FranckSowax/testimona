import { JoiErrorTypeEnum } from '../../enums/_.enums'

export class JoiErrorMiddlewareModel {
  constructor(readonly type: JoiErrorTypeEnum, readonly message: string) {}
}
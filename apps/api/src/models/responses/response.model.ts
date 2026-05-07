import {
  ErrorAuthResponseEnum,
  ErrorBiographyResponseEnum,
  ErrorChapterResponseEnum,
  ErrorCommonResponseEnum,
  ErrorDonationResponseEnum,
  ErrorFuneralEventResponseEnum,
  ErrorFuneralResponseEnum,
  ErrorMemorialRequestResponseEnum,
  ErrorMemorialResponseEnum,
  ErrorMemorialUserRelationshipResponseEnum,
  ErrorPhotoRequestResponseEnum,
  ErrorPhotoResponseEnum,
  ErrorServiceResponseEnum,
  ErrorTestimonialResponseEnum,
  ErrorUserResponseEnum,
} from '../../enums/_.enums';

class ResultResponseModel {
  constructor(
    readonly success: boolean,
    readonly error:
      | ErrorAuthResponseEnum
      | ErrorBiographyResponseEnum
      | ErrorChapterResponseEnum
      | ErrorCommonResponseEnum
      | ErrorDonationResponseEnum
      | ErrorFuneralEventResponseEnum
      | ErrorFuneralResponseEnum
      | ErrorMemorialResponseEnum
      | ErrorMemorialRequestResponseEnum
      | ErrorMemorialUserRelationshipResponseEnum
      | ErrorPhotoRequestResponseEnum
      | ErrorPhotoResponseEnum
      | ErrorServiceResponseEnum
      | ErrorTestimonialResponseEnum
      | ErrorUserResponseEnum
  ) {}
}

export class BooleanResponseModel {
  constructor(readonly result: ResultResponseModel, readonly data: boolean) {}
}

export class ErrorResponseModel {
  constructor(
    readonly result: ResultResponseModel,
    readonly data: object | null,
  ) {}
}

export class ObjectResponseModel {
  constructor(
    readonly result: ResultResponseModel,
    readonly data: object | null,
  ) {}
}

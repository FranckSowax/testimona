export enum ErrorCommonResponseEnum {
  NoError = '',
  InvalidBodyData = 'InvalidBodyData',
  InvalidParameter = 'InvalidParameter',
  InvalidQueryParameter ='InvalidQueryParameter',
  MissingParameter = 'MissingParameter',
  MissingQueryParameter = 'MissingQueryParameter'
}

export enum ErrorServiceResponseEnum {
  DataAlreadyExists = 'DataAlreadyExists',
  DataNotFound = 'DataNotFound',
}

export enum ErrorAuthResponseEnum {
  ActivationEmailRegisterFailed = "ActivationEmailRegisterFailed",
  CreateRegisterTokenFailed = 'CreateRegisterTokenFailed',
  CreateTokenFailed = 'CreateTokenFailed',
  EmailSocialMediaRequired = 'EmailSocialMediaRequired',
  LoginFailed = 'LoginFailed',
  LogoutFailed = 'LogoutFailed',
  LoginSocialMediaFailed = 'LoginSocialMediaFailed',
  RegisterFailed = 'RegisterFailed',
  RegisterSocialMediaFailed = 'RegisterSocialMediaFailed'
}

export enum ErrorBiographyResponseEnum {
  BiographyNotExist = 'BiographyNotExist',
  CreateBiographyByMemorialIdFailed = 'CreateBiographyByMemorialIdFailed',
  UpdateBiographyFailed = 'UpdateBiographyFailed'
}

export enum ErrorChapterResponseEnum {
  CreateChapterByMemorialIdFailed = "CreateChapterByMemorialIdFailed",
  DeleteChapterFailed = "DeleteChapterFailed",
  ChapterNotExist = "ChapterNotExist",
  UpdateChapterFailed = "UpdateChapterFailed"
}

export enum ErrorDonationResponseEnum {
  StartMakeDonationFailed = "StartMakeDonationFailed",
  UpdateDonationGoalFailed = 'UpdateDonationGoalFailed'
}

export enum ErrorFuneralEventResponseEnum {
  CreateFuneralEventByMemorialIdFailed = "CreateFuneralEventByMemorialIdFailed",
  DeleteFuneralEventFailed = "DeleteFuneralEventFailed",
  FuneralEventNotExist = "FuneralEventNotExist",
  UpdateFuneralEventFailed = "UpdateFuneralEventFailed"
}

export enum ErrorFuneralResponseEnum {
  CreateFuneralByMemorialIdFailed = "CreateFuneralByMemorialIdFailed",
  FuneralNotExist = "FuneralNotExist",
  UpdateFuneralFailed = "UpdateFuneralFailed"
}

export enum ErrorMemorialResponseEnum {
  CreateMemorialFailed = "CreateMemorialFailed",
  DeleteMemorialFailed = "DeleteMemorialFailed",
  MemorialNotExist = "MemorialNotExist",
  UpdateMemorialFailed = "UpdateMemorialFailed"
}

export enum ErrorMemorialRequestResponseEnum {
  CreateMemorialRequestFailed = "CreateMemorialRequestFailed",
  MemorialRequestAcceptedNotUpdated = "MemorialRequestAcceptedNotUpdated",
  MemorialRequestNotFound = "MemorialRequestNotFound",
  MemorialRequestRejectedNotUpdated = "MemorialRequestRejectedNotUpdated",
  SendAllowedRequestEmailApplicantNotFound = "SendAllowedRequestEmailApplicantNotFound",
  SendAllowedRequestEmailFailed = "SendAllowedRequestEmailFailed",
  SendAllowedRequestEmailMemorialNotFound = "SendAllowedRequestEmailMemorialNotFound",
  SendEmailRequestAdministratorsNotFound = "SendEmailRequestAdministratorsNotFound",
  SendEmailRequestMemorialNotFound = "SendEmailRequestMemorialNotFound",
  SendEmailRequestMemorialFailed = "SendEmailRequestMemorialFailed",
  SendRejectedRequestEmailApplicantNotFound = "SendRejectedRequestEmailApplicantNotFound",
  SendRejectedRequestEmailFailed = "SendRejectedRequestEmailFailed",
  SendRejectedRequestEmailMemorialNotFound = "SendRejectedRequestEmailMemorialNotFound",
}

export enum ErrorMemorialUserRelationshipResponseEnum {
  AddAdminToMemorialFailed = "AddAdminToMemorialFailed"
}

export enum ErrorPhotoRequestResponseEnum {
  PhotoNotExist = "PhotoNotExist",
}

export enum ErrorPhotoResponseEnum {
  LikePhotoFailed = 'LikePhotoFailed',
  UserLikedPhotoFailed = 'UserLikedPhotoFailed'
}

export enum ErrorTestimonialResponseEnum {
  CreateTestimonialByMemorialIdFailed = "CreateTestimonialByMemorialIdFailed",
  DeleteTestimonialFailed = "DeleteTestimonialFailed",
  LikeTestimonialFailed = "LikeTestimonialFailed",
  TestimonialNotExist = "TestimonialNotExist",
  UnlikeTestimonialFailed = "UnlikeTestimonialFailed",
  UserLikedTestimonialFailed = "UserLikedTestimonialFailed",
  UserUnlikedTestimonialFailed = "UserUnlikedTestimonialFailed",
  UpdateTestimonialFailed = "UpdateTestimonialFailed"
}

export enum ErrorUserResponseEnum {
  AdminNotExist = "AdminNotExist",
  UpdateAnswersFailed = "UpdateAnswersFailed",
  UpdateUserFailed = "UpdateUserFailed",
  UserNotExist = "UserNotExist"
}
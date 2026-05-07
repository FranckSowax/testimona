export enum ApiResultResponseEnum {
  // Commun error
  InvalidBodyData = 'InvalidBodyData',
  InvalidParameter = 'InvalidParameter',
  MissingParameter = 'MissingParameter',
  NoError = '',

  // Other error to order
  CreateMemorialFailed = 'CreateMemorialFailed',
  CreateRegisterTokenFailed = 'CreateRegisterTokenFailed',
  CreateTokenFailed = 'CreateTokenFailed',
  DataAlreadyExists = 'DataAlreadyExists',
  DataNotFound = 'DataNotFound',
  DeleteMemorialFailed = 'DeleteMemorialFailed',
  EmailSocialMediaRequired = 'EmailSocialMediaRequired',

  LoginFailed = 'LoginFailed',
  LoginSocialMediaFailed = 'LoginSocialMediaFailed',
  LogoutFailed = 'LogoutFailed',

  RegisterFailed = 'RegisterFailed',
  RegisterSocialMediaFailed = 'RegisterSocialMediaFailed',
  UnknownError = 'UnknownError',

  // Create a testimona by memorialId
  MemorialNotExist = "MemorialNotExist",
  CreateTestimonialByMemorialIdFailed = "CreateTestimonialByMemorialIdFailed",

  // Edit a testimona
  UpdateMemorialFailed = "UpdateMemorialFailed",

  // Create request for admin
  CreateMemorialRequestFailed = "CreateMemorialRequestFailed",

  // Edit Funeral Event
  FuneralEventNotExist = "FuneralEventNotExist",
  UpdateFuneralEventFailed = "UpdateFuneralEventFailed",

  // Edit Chapter
  ChapterEventNotExist = "ChapterEventNotExist",
  UpdateChapterEventFailed = "UpdateChapterEventFailed",

  // Edit Testimona
  TestimonaEventNotExist = "TestimonaEventNotExist",
  UpdateTestimonaEventFailed = "UpdateTestimonaEventFailed"
}

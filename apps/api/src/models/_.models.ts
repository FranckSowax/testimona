// Middlewares
import { JoiErrorMiddlewareModel } from './middlewares/joi-error.model';
import { VerifyErrors as JwtVerifyErrors } from 'jsonwebtoken';

// Responses
import {
  BooleanResponseModel,
  ErrorResponseModel,
  ObjectResponseModel,
} from './responses/response.model';

// Services
import { SecurityQuestionModel } from './services/security-question.model';
import { ErrorServiceModel } from './services/error.model';
import {
  FacebookDataModel,
  GoogleDataModel,
  SocialUserModel,
} from './services/social-media.model';
import { LanguageModel } from './services/language.model';
import { UserIdentityModel, UserServiceModel } from './services/user.model';
import {
  AdminListMemorialModel,
  AdminMemorialModel,
  MemorialCreateModel,
  MemorialModel,
  MemorialSearchModel,
  MyMemorialModel,
} from './services/memorial.model';
import { CountryModel } from './services/country.model';
import {
  TestimonialCreateByMemorialIdModel,
  TestimonialModel,
} from './services/testimonial.model';
import {
  MemorialAdminUserRelationshipModel,
  MemorialUserRelationshipModel,
} from './services/memorial-user-relationship.model';
import { MemorialRequestCreateModel } from './services/memorial-request.model';
import {
  FuneralCreateByMemorialIdModel,
  FuneralModel,
} from './services/funeral.model';
import { FuneralEventCreateByMemorialIdModel, FuneralEventModel } from './services/funeral-event.model';
import { BiographyModel } from './services/biography.model';
import { ChapterCreateByMemorialIdModel, ChapterModel } from './services/chapter.model';

export {
  // Middlewares
  JoiErrorMiddlewareModel,
  JwtVerifyErrors,
  // Models
  BooleanResponseModel,
  ErrorResponseModel,
  ObjectResponseModel,
  // Services - Admin
  AdminListMemorialModel,
  AdminMemorialModel,
  // Services - Public
  BiographyModel,
  ChapterCreateByMemorialIdModel,
  ChapterModel,
  CountryModel,
  ErrorServiceModel,
  FacebookDataModel,
  FuneralEventCreateByMemorialIdModel,
  FuneralEventModel,
  FuneralCreateByMemorialIdModel,
  FuneralModel,
  GoogleDataModel,
  LanguageModel,
  MemorialModel,
  MemorialCreateModel,
  MemorialAdminUserRelationshipModel,
  MemorialRequestCreateModel,
  MemorialUserRelationshipModel,
  MemorialSearchModel,
  MyMemorialModel,
  SecurityQuestionModel,
  SocialUserModel,
  TestimonialCreateByMemorialIdModel,
  TestimonialModel,
  UserIdentityModel,
  UserServiceModel,
};

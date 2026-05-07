import { SecurityQuestionModel } from "src/app/shared/models/security-question.model";

export class AccountUserModel {
  constructor(
    readonly email: string,
    readonly firstname: string,
    readonly lastname: string,
    readonly nickname: string,
    readonly loginType: string,
    readonly language: LanguageModel,
    readonly questionsData: SecurityQuestionModel[],
  ) { }
}

export class LanguageModel {
  constructor(
    readonly code: string
  ) {}
}

export class AccountUserSaveModel {
  constructor(
    readonly firstname: string,
    readonly lastname: string,
    readonly nickname: string,
    readonly language: string,
  ) {}
}

export class AccountSecurityQuestionSaveModel {
  constructor(
    readonly previousQuestionId: number,
    readonly id: number,
    public answer: string,
  ) {}
}

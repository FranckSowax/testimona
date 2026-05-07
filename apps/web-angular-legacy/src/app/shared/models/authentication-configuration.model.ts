import { SecurityQuestionModel } from "./security-question.model";

export class AuthenticationConfigurationModel {
    constructor(
    readonly securityQuestions: Array<SecurityQuestionModel>) {}
}
export class SecurityQuestionModel {
  constructor(readonly id: number, readonly contentKey: string) {}
}

export class SecurityQuestionAnswerModel {
  constructor(readonly questionId: number, readonly contentKey: string) {}
}
import { DisplayName } from "@prisma/client";

export class UpdateUserRequestModel {
    constructor(
        readonly firstname: string,
        readonly lastname: string,
        readonly nickname: string,
        readonly language: string,
    ) {}
}

export class UpdateAnswerRequestModel {
    constructor(
        readonly previousQuestionId: number,
        readonly id: number,
        public answer: string
    ) {}
}

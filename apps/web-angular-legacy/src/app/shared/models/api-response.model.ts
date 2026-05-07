import { ApiResultResponseEnum } from "../enums/api-error-response.enum";

export class ApiBooleanResponseModel {
    constructor(
        readonly result: ResultResponse,
        readonly data: boolean,
    ) { }
}

export class ApiObjectResponseModel {
    constructor(
        readonly result: ResultResponse,
        readonly data: any | null,
    ) { }
}

export class ApiErrorResponseModel {
    readonly result = new ResultResponse(false, ApiResultResponseEnum.UnknownError);

    constructor(
        readonly data: any
    ) { }
}

class ResultResponse {
    constructor(
        readonly success: boolean,
        readonly error: ApiResultResponseEnum
    ) { }
}
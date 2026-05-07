import Joi from 'joi';
import _ from 'lodash';
import { JoiErrorTypeEnum } from '../../enums/_.enums';
import { StringHelpers } from '../../helpers/_.helpers';
import { JoiErrorMiddlewareModel } from '../../models/_.models';

export class JoiMiddlewares {
  static getJoiFormatMessages(): Joi.AsyncValidationOptions {
    return {
      abortEarly: false, // exit after first error
      stripUnknown: true, // remove unknown props
      messages: {
        'any.required': '{#label} is a required field for this operation',
      },
    };
  }

  static getJoiFormatErrors(detailErrors: Joi.ValidationErrorItem[]): any {
    console.log('detailErrors', detailErrors);

    let requiredErrorMessage = '';
    let formatErrorMessage = '';
    let lengthErrorMessage = '';

    _.forEach(detailErrors, (error: Joi.ValidationErrorItem) => {
      console.log(error);
      switch (error.type) {
        case 'any.required':
        case 'any.custom':
        case 'string.empty':
          requiredErrorMessage = StringHelpers.concat(
            [requiredErrorMessage, error.context?.key],
            ', ',
          );
          break;
        case 'string.email':
        case 'any.invalid':
        case 'array.base':
        case 'date.base':
        case 'number.base':
        case 'string.pattern.base':
          formatErrorMessage = StringHelpers.concat(
            [formatErrorMessage, error.context?.key],
            ', ',
          );
          break;
        case 'date.format':
          formatErrorMessage = StringHelpers.concat(
            [formatErrorMessage, `${error.context?.key}: (${error.context?.format})`],
            ', ',
          );
          break;
        case 'array.length':
          lengthErrorMessage = StringHelpers.concat(
            [
              lengthErrorMessage,
              StringHelpers.concat(
                [
                  error.context?.key,
                  StringHelpers.concat(
                    [
                      '(required: ',
                      error.context?.limit,
                      ', actual: ',
                      error.context?.value == 0 ? "0" : error.context?.value.toString(),
                      ')',
                    ],
                    '',
                  ),
                ],
                ' ',
              ),
            ],
            ', ',
          );
          break;
        case 'string.min':
        case 'number.min':
          lengthErrorMessage = StringHelpers.concat(
            [
              lengthErrorMessage,
              StringHelpers.concat(
                [
                  error.context?.key,
                  StringHelpers.concat(
                    [
                      '(min: ',
                      error.context?.limit,
                      ', actual: ',
                      error.context?.value == 0 ? "0" : error.context?.value.toString(),
                      ')',
                    ],
                    '',
                  ),
                ],
                ' ',
              ),
            ],
            ', ',
          );
          break;
        case 'array.min':
            lengthErrorMessage = StringHelpers.concat(
              [
                lengthErrorMessage,
                StringHelpers.concat(
                  [
                    error.context?.key, StringHelpers.concat(
                      [
                        '(min: ', error.context?.limit,
                        ', actual: ', error.context?.value.length == 0 ? "0" : error.context?.value.length.toString(),
                        ')',
                      ], '',
                    ),
                  ], ' ',
                ),
              ], ', ',
            );
            break;
        case 'string.max':
        case 'number.max':
          lengthErrorMessage = StringHelpers.concat(
            [
              lengthErrorMessage,
              StringHelpers.concat(
                [
                  error.context?.key,
                  StringHelpers.concat(
                    [
                      '(min: ',
                      error.context?.limit,
                      ', actual: ',
                      error.context?.value,
                      ')',
                    ],
                    '',
                  ),
                ],
                ' ',
              ),
            ],
            ', ',
          );
          break;
        case 'array.max':
          lengthErrorMessage = StringHelpers.concat(
            [
              lengthErrorMessage,
              StringHelpers.concat(
                [
                  error.context?.key, StringHelpers.concat(
                    [
                      '(min: ', error.context?.limit,
                      ', actual: ', error.context?.value.length,
                      ')',
                    ], '',
                  ),
                ], ' ',
              ),
            ], ', ',
          );
          break;
        case 'date.format':

          break;
      }
    });

    let requiredError = new JoiErrorMiddlewareModel(
      JoiErrorTypeEnum.required,
      requiredErrorMessage,
    );
    let formatError = new JoiErrorMiddlewareModel(
      JoiErrorTypeEnum.format,
      formatErrorMessage,
    );
    let lengthError = new JoiErrorMiddlewareModel(
      JoiErrorTypeEnum.length,
      lengthErrorMessage,
    );

    const arrayResult = new Array<JoiErrorMiddlewareModel>();

    if (requiredError.message != '') arrayResult.push(requiredError);
    if (formatError.message != '') arrayResult.push(formatError);
    if (lengthError.message != '') arrayResult.push(lengthError);

    return arrayResult;
  }
}

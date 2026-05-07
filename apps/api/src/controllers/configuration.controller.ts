import express from 'express';
import { ErrorCommonResponseEnum, ErrorServiceResponseEnum } from '../enums/_.enums';
import { ObjectResponseModel } from '../models/_.models';
import { CountryService } from '../services/country.service';
import { SecurityQuestionService } from '../services/security-question.service';

export class ConfigurationController {
  async configuration(req: express.Request, res: express.Response) {
    try {
      const securityQuestions = await SecurityQuestionService.getInstance().list();

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: securityQuestions != null && securityQuestions.length > 0 ? ErrorCommonResponseEnum.NoError : ErrorServiceResponseEnum.DataNotFound,
          },
          { securityQuestions: securityQuestions },
        ),
      );
    } catch (error: any) {
      console.log('catch: config register failed');
      return res.status(500).send({ error: 'config register failed' });
    }
  }

  async memorial(req: express.Request, res: express.Response) {
    try {
      const countries = await CountryService.getInstance().list();

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: countries != null && countries.length > 0 ? ErrorCommonResponseEnum.NoError : ErrorServiceResponseEnum.DataNotFound,
          },
          { countries: countries },
        ),
      );
    } catch (error: any) {
      console.log('catch: config memorial failed');
      return res.status(500).send({ error: 'config memorial failed' });
    }
  }
}

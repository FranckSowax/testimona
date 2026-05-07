import express from 'express';
import { ErrorCommonResponseEnum, ErrorDonationResponseEnum, ErrorMemorialResponseEnum, IncludeDataExistsEnum } from '../enums/_.enums';
import { BooleanResponseModel, ErrorResponseModel, ObjectResponseModel } from '../models/_.models';
import { MemorialService } from '../services/memorial.service';
import { DonationService } from '../services/donation.service';
import { AdminDonationGoalResponseModel, AdminDonationResponseModel, DonationGoalResponseModel, DonationResponseModel } from '../models/responses/donation.model';
import { map } from 'lodash';

export class DonationController {
  //#region Admin
  async adminGetDonationGoal(req: express.Request, res: express.Response) {
    try {
      // find if the memorial exists
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId,
      );
      if (!memorialExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.MemorialNotExist,
            },
            null,
          ),
        );
      }

      const goalOfDonation = await DonationService.getInstance().adminGetDonationGoal(+req.params.memorialId);
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          {
            donationGoal: goalOfDonation.donationGoal,
            totalAmountDonation: goalOfDonation.totalAmountDonation
          } as AdminDonationGoalResponseModel
        ),
      );
    } catch (error: any) {
      console.log('catch: list donations by memorialId failed');
      return res
        .status(500)
        .send({ error: 'list donations by memorialId failed' });
    }
  }

  async adminListByMemorialId(req: express.Request, res: express.Response) {
    try {
      // find if the memorial exists
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.AllData,
        +req.params.memorialId,
      );
      if (!memorialExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.MemorialNotExist,
            },
            null,
          ),
        );
      }

      const listOfDonations = await DonationService.getInstance().adminListByMemorialId(+req.params.memorialId, +req.query.page!, +req.query.pgSize!);
      let returnData = new Array<DonationResponseModel>();

      if (listOfDonations.total > 0) {
        returnData = map(listOfDonations.donationItems, (item) => {
          return {
            amount: item.amount,
            anonymous: item.anonymous,
            comment: item.comment,
            date: item.date,
            donorDetails: {
              userId: item.donorDetails.userId,
              firstname: item.donorDetails.firstname,
              lastname: item.donorDetails.lastname,
              nickname: item.donorDetails.nickname,
              photos: item.donorDetails.photos ? {
                urls: {
                  circle: item.donorDetails.photos[0].urls.circle,
                  full: item.donorDetails.photos[0].urls.full,
                  medium: item.donorDetails.photos[0].urls.medium,
                  thumbnail: item.donorDetails.photos[0].urls.thumbnail,
                }
              } : undefined
            }
          } as DonationResponseModel;
        });
      }

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          {
            total: listOfDonations.total,
            donations: listOfDonations.donationItems
          } as AdminDonationResponseModel
        ),
      );
    } catch (error) {
      console.log('catch: admin list donations by memorialId failed');
      return res
        .status(500)
        .send({ error: 'admin list donations by memorialId failed' });
    }
  }
  //#endregion

  //#region Pubic
  async updateDonationGoal(req: express.Request, res: express.Response) {
    try {
      // find if the memorial exists
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId,
      );
      if (!memorialExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.MemorialNotExist,
            },
            null,
          ),
        );
      }

      // update donationn goal
      const donationGoalIsUpdated = await DonationService.getInstance().updateDonationGoal(
        +req.params.memorialId,
        +req.body.data.amount,
        req.body.data.message,
      );

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: donationGoalIsUpdated,
            error: donationGoalIsUpdated ? ErrorCommonResponseEnum.NoError : ErrorDonationResponseEnum.UpdateDonationGoalFailed,
          },
          donationGoalIsUpdated,
        ),
      );
    } catch (error: any) {
      console.log('catch: update chapter failed');
      return res
        .status(500)
        .send({ error: 'update chapter failed' });
    }
  }

  async getDonationGoal(req: express.Request, res: express.Response) {
    try {
      // find if the memorial exists
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId,
      );
      if (!memorialExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.MemorialNotExist,
            },
            null,
          ),
        );
      }

      const goalOfDonation = await DonationService.getInstance().getDonationGoal(+req.params.memorialId);
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          {
            donationGoal: goalOfDonation.donationGoal,
            totalAmountDonation: goalOfDonation.totalAmountDonation
          } as DonationGoalResponseModel
        ),
      );
    } catch (error: any) {
      console.log('catch: list donations by memorialId failed');
      return res
        .status(500)
        .send({ error: 'list donations by memorialId failed' });
    }
  }

  async listByMemorialId(req: express.Request, res: express.Response) {
    try {
      // find if the memorial exists
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId,
      );
      if (!memorialExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorMemorialResponseEnum.MemorialNotExist,
            },
            null,
          ),
        );
      }

      const listOfDonations = await DonationService.getInstance().listByMemorialId(+req.params.memorialId);
      let returnData = new Array<DonationResponseModel>();

      if (listOfDonations.length > 0) {
        returnData = map(listOfDonations, (item) => {
          return {
            amount: item.amount,
            anonymous: item.anonymous,
            comment: item.comment,
            date: item.date,
            donorDetails: item.anonymous ? null : {
              userId: item.donorDetails.userId,
              firstname: item.donorDetails.firstname,
              lastname: item.donorDetails.lastname,
              nickname: item.donorDetails.nickname,
              photos: item.donorDetails.photos ? {
                urls: {
                  circle: item.donorDetails.photos[0].urls.circle,
                  full: item.donorDetails.photos[0].urls.full,
                  medium: item.donorDetails.photos[0].urls.medium,
                  thumbnail: item.donorDetails.photos[0].urls.thumbnail,
                }
              } : undefined
            }
          } as DonationResponseModel;
        });
      }

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          returnData
        ),
      );
    } catch (error: any) {
      console.log('catch: list donations by memorialId failed');
      return res
        .status(500)
        .send({ error: 'list donations by memorialId failed' });
    }
  }

  async createWithMemorialId(req: express.Request, res: express.Response) {
    try {
        // find if the memorial exists
        const memorialExists = await MemorialService.getInstance().existsById(
          IncludeDataExistsEnum.ActiveData,
          +req.params.memorialId,
        );
        if (!memorialExists) {
          return res.status(200).send(
            new ErrorResponseModel(
              {
                success: false,
                error: ErrorMemorialResponseEnum.MemorialNotExist,
              },
              null,
            ),
          );
        }
  
        // start make a donation process
        const donationProcessId = await DonationService.getInstance().createByMemorialId(
          req.body.userId,
          +req.params.memorialId,
          req.body.data,
        );
  
        const resulOfCreation = donationProcessId.donationId != undefined && donationProcessId.donationId != null && donationProcessId.donationId.trim() != '';
        return res.status(200).send(
          new ObjectResponseModel(
            {
              success: resulOfCreation,
              error: resulOfCreation ? ErrorCommonResponseEnum.NoError : ErrorDonationResponseEnum.StartMakeDonationFailed,
            },
            {
              id: donationProcessId.donationId
            },
          ),
        );
    } catch (error: any) {
      console.log('catch: start donation process failed');
      return res
        .status(500)
        .send({ error: 'start donation process failed' });
    }
  }

  async updateWithCheckout(req: express.Request, res: express.Response) {
    try {
        const getDonationData = await DonationService.getInstance().retrieveDonationDataInStripe(req.params.checkoutId!.toString());
        if (!getDonationData) {
            return res.redirect(process.env.WEBSITE_URL! + '/notfound');
        }

        const updateDonationWithStripeData = await DonationService.getInstance().updateDonation(getDonationData);
        if (!updateDonationWithStripeData) {
            return res.redirect(process.env.WEBSITE_URL! + '/404');
        }

        const updateDonationGoalWithStripeData = await DonationService.getInstance().updateMemorialDonationTotalAmount(updateDonationWithStripeData.memorialId, getDonationData.amount);

        let redirectUrl = '';
        switch (getDonationData.status) {
            case 'Succeeded':
                redirectUrl = '/success/' + updateDonationWithStripeData.donationId;
                break;
            case 'Processing':
                redirectUrl = '';
                break;
            default:
                redirectUrl = '/failed/' + updateDonationWithStripeData.donationId;
                break;
        }
        
        return res.redirect(process.env.WEBSITE_URL! + '/memorial/' + updateDonationWithStripeData.memorialUrl + redirectUrl);
    } catch (error: any) {
        console.log('catch: update donation failed');
        return res.redirect(process.env.WEBSITE_URL! + '/404');
    }
  }
  //#endregion
}

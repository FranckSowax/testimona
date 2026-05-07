import express from 'express';
import { MemorialService } from '../services/memorial.service';
import {
  BooleanResponseModel,
  ErrorResponseModel,
  ObjectResponseModel,
} from '../models/_.models';
import {
  ErrorCommonResponseEnum,
  ErrorMemorialResponseEnum,
  ErrorServiceResponseEnum,
  ErrorTestimonialResponseEnum,
  IncludeDataExistsEnum,
} from '../enums/_.enums';
import { TestimonialService } from '../services/testimonial.service';
import { MemorialUserRelationshipService } from '../services/memorial-user-relationship.service';
import { MediaObjectType } from '@prisma/client';
import { UserLikedItemService } from '../services/user-liked-item.service';

export class TestimonialController {
  async createWithMemorialId(req: express.Request, res: express.Response) {
    try {
      // find if the memorial existes
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

      // create testimonial with memorialId
      const testimonialCreateByMemorialId = await TestimonialService.getInstance().createByMemorialId(
        req.body.userId,
        +req.params.memorialId,
        req.body.data,
      );

      if (!testimonialCreateByMemorialId || testimonialCreateByMemorialId.id == 0) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorTestimonialResponseEnum.CreateTestimonialByMemorialIdFailed,
            },
            null,
          ),
        );
      }

      // save the relationship between the user and the memorial
      const addRelationshipResult = await MemorialUserRelationshipService.getInstance().addMemorialRelationship(
        req.body.userId,
        +req.params.memorialId,
        req.body.data.relative,
        false);

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          {
            id: testimonialCreateByMemorialId.id,
            createDate: testimonialCreateByMemorialId.createDate,
          },
        ),
      );
    } catch (error: any) {
      console.log('catch: create testimonial by memorialId failed');
      return res
        .status(500)
        .send({ error: 'create testimonial by memorialId failed' });
    }
  }

  async listByMemorialId(req: express.Request, res: express.Response) {
    try {
      // find if the memorial existes
      const memorialExists = await MemorialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.memorialId
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

      const listOfMemorials = await TestimonialService.getInstance().listByMemorialId(+req.params.memorialId, +req.query.page!, +req.query.pgSize!, IncludeDataExistsEnum.ActiveData, req.body.userId);
      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          listOfMemorials,
        ),
      );
    } catch (error: any) {
      console.log('catch: list testimonials by memorialId failed');
      return res
        .status(500)
        .send({ error: 'list testimonials by memorialId failed' });
    }
  }

  async get(req: express.Request, res: express.Response) {
    try {
      const testimonialItem = await TestimonialService.getInstance().getById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.testimonialId,
        req.body.userId
      );
      const testimonialFound = !!testimonialItem && testimonialItem.id > 0;

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: testimonialFound,
            error: testimonialFound
              ? ErrorCommonResponseEnum.NoError
              : ErrorServiceResponseEnum.DataNotFound,
          },
          testimonialItem,
        ),
      );
    } catch (err) {
      console.log('catch: get testimonial by id failed');
      return res.status(500).send({ error: 'get testimonial by id failed' });
    }
  }

  async getMyTestimonials(req: express.Request, res: express.Response) {
    try {
      const testimonialItems = await TestimonialService.getInstance().getMyTestimonials(req.body.userId);

      return res.status(200).send(
        new ObjectResponseModel(
          {
            success: !!testimonialItems,
            error: !!testimonialItems
              ? ErrorCommonResponseEnum.NoError
              : ErrorServiceResponseEnum.DataNotFound,
          },
          testimonialItems,
        ),
      );
    } catch (err) {
      console.log('catch: get my testimonials failed');
      return res.status(500).send({ error: 'get my testimonials failed' });
    }
  }

  async update(req: express.Request, res: express.Response) {
    try {
      // find if the testimonial exists
      const testimonialExists = await TestimonialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.testimonialId,
      );
      if (!testimonialExists) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorTestimonialResponseEnum.TestimonialNotExist,
            },
            null,
          ),
        );
      }

      // update testimonial
      const testimonialIsUpdated = await TestimonialService.getInstance().update(
        req.body.userId,
        +req.params.testimonialId,
        req.body.data,
      );
      if (testimonialIsUpdated == null) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorTestimonialResponseEnum.UpdateTestimonialFailed,
            },
            null,
          ),
        );
      }

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          testimonialIsUpdated,
        ),
      );
    } catch (error: any) {
      console.log('catch: update testimonial failed');
      return res
        .status(500)
        .send({ error: 'update testimonial failed' });
    }
  }

  async like(req: express.Request, res: express.Response) {
    try {
      // find if the testimonial exists
      const testimonialExists = await TestimonialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.testimonialId,
      );
      if (!testimonialExists) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorTestimonialResponseEnum.TestimonialNotExist,
            },
            false,
          ),
        );
      }

      // update testimonial
      const testimonialIsUpdated = await TestimonialService.getInstance().like(+req.params.testimonialId);
      if (testimonialIsUpdated == null) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorTestimonialResponseEnum.LikeTestimonialFailed,
            },
            false,
          ),
        );
      }

      // add link between current user and item liked
      const userLikedItem = await UserLikedItemService.getInstance().like(req.body.userId, req.params.testimonialId, MediaObjectType.Testimonial);
      if (userLikedItem == false) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorTestimonialResponseEnum.UserLikedTestimonialFailed,
            },
            false,
          ),
        );
      }

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          testimonialIsUpdated,
        ),
      );
    } catch (error: any) {
      console.log('catch: like testimonial failed');
      return res
        .status(500)
        .send({ error: 'like testimonial failed' });
    }
  }

  async unlike(req: express.Request, res: express.Response) {
    try {
      // find if the testimonial exists
      const testimonialExists = await TestimonialService.getInstance().existsById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.testimonialId,
      );
      if (!testimonialExists) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorTestimonialResponseEnum.TestimonialNotExist,
            },
            false,
          ),
        );
      }

      // update testimonial
      const testimonialIsUpdated = await TestimonialService.getInstance().unlike(+req.params.testimonialId);
      if (testimonialIsUpdated == null) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorTestimonialResponseEnum.UnlikeTestimonialFailed,
            },
            false,
          ),
        );
      }

      // remove link between current user and item liked
      const userUnlikedItem = await UserLikedItemService.getInstance().unlike(req.body.userId, req.params.testimonialId, MediaObjectType.Testimonial);
      if (userUnlikedItem == false) {
        return res.status(200).send(
          new BooleanResponseModel(
            {
              success: false,
              error: ErrorTestimonialResponseEnum.UserUnlikedTestimonialFailed,
            },
            false,
          ),
        );
      }

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: true,
            error: ErrorCommonResponseEnum.NoError,
          },
          testimonialIsUpdated,
        ),
      );
    } catch (error: any) {
      console.log('catch: unlike testimonial failed');
      return res
        .status(500)
        .send({ error: 'unlike testimonial failed' });
    }
  }

  async delete(req: express.Request, res: express.Response) {
    try {
      // find if the testimonial exists
      const testimonialData = await TestimonialService.getInstance().getFullDataById(
        IncludeDataExistsEnum.ActiveData,
        +req.params.testimonialId,
        req.body.userId
      );
      if (testimonialData == null || testimonialData.userInfo?.userId != req.body.userId) {
        return res.status(200).send(
          new ErrorResponseModel(
            {
              success: false,
              error: ErrorTestimonialResponseEnum.TestimonialNotExist,
            },
            null,
          ),
        );
      }

      const testimonialIdDeleted = await TestimonialService.getInstance().delete(
        req.body.userId,
        +req.params.testimonialId,
      );
      const testimonialIsDeleted = testimonialIdDeleted === +req.params.testimonialId;

      return res.status(200).send(
        new BooleanResponseModel(
          {
            success: testimonialIsDeleted,
            error: testimonialIsDeleted
              ? ErrorCommonResponseEnum.NoError
              : ErrorTestimonialResponseEnum.DeleteTestimonialFailed,
          },
          testimonialIsDeleted,
        ),
      );
    } catch (err) {
      console.log('catch: delete testimonial failed');
      return res.status(500).send({ error: 'delete testimonial failed' });
    }
  }
}

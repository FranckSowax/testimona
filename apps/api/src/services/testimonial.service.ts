import { LogTypeError, MediaObjectType, Relative, Testimonial } from '@prisma/client';
import {
  ErrorServiceModel,
  MemorialUserRelationshipModel,
  TestimonialCreateByMemorialIdModel,
  TestimonialModel,
  UserIdentityModel,
} from '../models/_.models';
import { CommonService } from './commons/common.service';
import { LogService } from './commons/log.service';
import * as _ from 'lodash';
import { IncludeDataExistsEnum } from '../enums/_.enums';
import { UserService } from './user.service';
import { UserHelpers } from '../helpers/_.helpers';
import { MemorialUserRelationshipService } from './memorial-user-relationship.service';
import { PhotoUrlResponseModel } from '../models/responses/photo.model';
import { PhotoDatabaseService } from './photo.database.service';
import { UserLikedItemService } from './user-liked-item.service';
import { MyTestimonialModel } from '../models/services/testimonial.model';
import { userInfo } from 'os';

const serviceName = 'TestimonialService';

export class TestimonialService extends CommonService {
  private static _instance: TestimonialService;

  static getInstance(): TestimonialService {
    if (!TestimonialService._instance) {
      TestimonialService._instance = new TestimonialService();
    }
    return TestimonialService._instance;
  }

  constructor() {
    super();
  }

  async createByMemorialId(
    currentUserId: string,
    memorialId: number,
    testimonialData: any,
  ): Promise<TestimonialCreateByMemorialIdModel> {
    try {
        const testimonialCreated = await this.executeQueries<Testimonial>([
            this._prismaDb.testimonial.create({
              data: {
                content: testimonialData.content.trim(),
                createByIdFk: currentUserId,
                updateByIdFk: currentUserId,
                disabled: false,
                memorialIdFk: memorialId
              },
            }),
          ]);

        return Promise.resolve({
            id: testimonialCreated[0].testimonialId,
            createDate: testimonialCreated[0].createAt
        })
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'createByMemorialId', { memorialId, testimonialData, currentUserId }),
        error.message,
      );
      throw error;
    }
  }

  async listByMemorialId(memorialId: number, page: number, pageSize: number, includeData: IncludeDataExistsEnum, currentUserId: string): Promise<TestimonialModel[]> {
    try {
      let whereCondition: any = { memorialIdFk: memorialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const take = pageSize;
      const skip = (page < 0 ? 0 : page) * pageSize;

      const testimonialData = await this.executeQueries<Testimonial[]>([
        this._prismaDb.testimonial.findMany({
          skip: skip,
          take: take,
          where: whereCondition,
          orderBy: [
            {
              createAt: 'desc',
            },
          ],
          select: {
            testimonialId: true,
            content: true,
            numberOfLike: true,
            createByIdFk: true,
            createAt: true,
            updateAt: true,
          }
        }),
      ]);

      if (testimonialData == null || testimonialData.length == 0)
      return Promise.resolve([]);

      const userIds = _.uniq(_.map(testimonialData[0], (ite) => { return ite.createByIdFk; }));
      const userData = await UserService.getInstance().getIdentityDataForUserIds(userIds);

      const memorialUserRelationshipData = await MemorialUserRelationshipService.getInstance().getRelationshipDataForUserIds(memorialId, userIds);

      const testimonialIds = _.map(testimonialData[0], (ite) => { return ite.testimonialId.toString(); });
      const testimonialPhotoData = await PhotoDatabaseService.getInstance().getPhotoDataForObjectIds(MediaObjectType.Testimonial, testimonialIds);

      const testimonialsLikedForCurrentUser = await UserLikedItemService.getInstance().getAllLikedForUserIdAndObjectType(currentUserId, MediaObjectType.Testimonial);

      const returnData = _.map<Testimonial, TestimonialModel>(
        testimonialData[0],
        (item: Testimonial) => {
          let userInfos: UserIdentityModel | undefined = undefined;
          if (userData) {
            userInfos = _.find(userData, ((u) => { return u.userId == item.createByIdFk; }));
          }

          let memorialUserRelationshipInfos: MemorialUserRelationshipModel | undefined = undefined;
          if (memorialUserRelationshipData) {
            memorialUserRelationshipInfos = _.find(memorialUserRelationshipData, ((u) => { return u.userId == item.createByIdFk; }));
          }

          let testimonialPhotoInfos: PhotoUrlResponseModel[] | null = null;
          if (testimonialPhotoData) {
            testimonialPhotoInfos = _.filter(testimonialPhotoData, ((p) => { return p.objectId == item.testimonialId.toString(); }));
          }

          return new TestimonialModel(
            item.testimonialId,
            item.content,
            item.numberOfLike,
            _.findIndex(testimonialsLikedForCurrentUser, (ite) => ite.itemId == item.testimonialId.toString()) > -1,
            testimonialPhotoInfos ?? [],
            item.createAt,
            item.updateAt,
            {
              userId: userInfos?.userId!,
              identity: UserHelpers.getStringNameToDisplay(userInfos),
              relationship: memorialUserRelationshipInfos?.relationship!,
              photos: userInfos?.photos
            }
          );
        },
      );

      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'listByMemorialId', { memorialId }),
        error.message,
      );
      throw error;
    }
  }

  async getById(includeData: IncludeDataExistsEnum, testimonialId: number, currentUserId: string): Promise<TestimonialModel | null> {
    try {
      let whereCondition: any = { testimonialId: testimonialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const testimonialData = await this.executeQueries<Testimonial>([
        this._prismaDb.testimonial.findFirst({
          where: whereCondition,
          select: {
            testimonialId: true,
            content: true,
            numberOfLike: true
          }
        }),
      ]);

      if (!testimonialData || !testimonialData[0])
        return Promise.resolve(null);

      const photos = await PhotoDatabaseService.getInstance().getPhotoDataForObjectIds(MediaObjectType.Testimonial, [testimonialData[0].testimonialId.toString()]);
      const currentUserLikesTestimonial = await UserLikedItemService.getInstance().userLikesItem(currentUserId, testimonialId.toString(), MediaObjectType.Testimonial);

      return Promise.resolve(
        new TestimonialModel(
          testimonialData[0].testimonialId,
          testimonialData[0].content,
          testimonialData[0].numberOfLike,
          currentUserLikesTestimonial,
          photos ?? [],
          null,
          null,
          null
        )
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'existsById', {
          includeData,
          testimonialId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async getMyTestimonials(currentUserId: string): Promise<MyTestimonialModel[] | null> {
    try {
      let whereCondition: any = { createByIdFk: currentUserId };
      whereCondition = this.getWhereConditionForDisabled(
        IncludeDataExistsEnum.ActiveData,
        whereCondition,
      );

      const testimonialData = await this.executeQueries<Testimonial[]>([
        this._prismaDb.testimonial.findMany({
          where: whereCondition,
          orderBy: [
            {
              createAt: 'desc',
            },
          ],
          select: {
            testimonialId: true,
            content: true,
            numberOfLike: true,
            createAt: true,
            memorial: true,
            createByIdFk: true
          }
        }),
      ]);

      if (testimonialData == null || testimonialData.length == 0)
      return Promise.resolve([]);

      const userIds = _.uniq(_.map(testimonialData[0], (ite) => { return ite.createByIdFk; }));
      const userData = await UserService.getInstance().getIdentityDataForUserIds(userIds);

      const returnData = _.map<Testimonial, MyTestimonialModel>(
        testimonialData[0],
        (item: Testimonial | any) => {
          let userInfos: UserIdentityModel | undefined = undefined;
          if (userData) {
            userInfos = _.find(userData, ((u) => { return u.userId == item.createByIdFk; }));
          }

          // let memorialUserRelationshipInfos: MemorialUserRelationshipModel | undefined = undefined;
          // if (memorialUserRelationshipData) {
          //   memorialUserRelationshipInfos = _.find(memorialUserRelationshipData, ((u) => { return u.userId == item.createByIdFk; }));
          // }

          return new MyTestimonialModel(
            item.testimonialId,
            item.content,
            item.numberOfLike,
            item.createAt,
            {
              id: item.memorial.id,
              url: item.memorial.url,
              firstname: item.memorial.firstname.trim(),
              lastname: item.memorial.lastname.trim(),
            },
            {
              userId: userInfos?.userId!,
              identity: UserHelpers.getStringNameToDisplay(userInfos),
              relationship: Relative.Undefined, // memorialUserRelationshipInfos?.relationship!,
              photos: userInfos?.photos
            }
          );
        },
      );

      return Promise.resolve(returnData);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'getMyTestimonials', { currentUserId }),
        error.message,
      );
      throw error;
    }
  }

  async getFullDataById(includeData: IncludeDataExistsEnum, testimonialId: number, currentUserId: string): Promise<TestimonialModel | null> {
    try {
      let whereCondition: any = { testimonialId: testimonialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const testimonialData = await this.executeQueries<Testimonial>([
        this._prismaDb.testimonial.findFirst({
          where: whereCondition,
          select: {
            testimonialId: true,
            content: true,
            numberOfLike: true,
            createByIdFk: true,
            updateByIdFk: true
          }
        }),
      ]);

      if (!testimonialData || !testimonialData[0])
        return Promise.resolve(null);

      const photos = await PhotoDatabaseService.getInstance().getPhotoDataForObjectIds(MediaObjectType.Testimonial, [testimonialData[0].testimonialId.toString()]);
      const userData = await UserService.getInstance().getIdentityDataByUserId(testimonialData[0].createByIdFk);
      const currentUserLikesTestimonial = await UserLikedItemService.getInstance().userLikesItem(currentUserId, testimonialId.toString(), MediaObjectType.Testimonial);

      return Promise.resolve(
        new TestimonialModel(
          testimonialData[0].testimonialId,
          testimonialData[0].content,
          testimonialData[0].numberOfLike,
          currentUserLikesTestimonial,
          photos ?? [],
          null,
          null,
          {
            userId: testimonialData[0].createByIdFk,
            identity: UserHelpers.getStringNameToDisplay(userData ?? undefined),
            relationship: Relative.Undefined,
            photos: []
          }
        )
      );
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'existsById', {
          includeData,
          testimonialId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async existsById(includeData: IncludeDataExistsEnum, testimonialId: number): Promise<boolean> {
    try {
      let whereCondition: any = { testimonialId: testimonialId };
      whereCondition = this.getWhereConditionForDisabled(
        includeData,
        whereCondition,
      );

      const count = await this.executeQueries<number>([
        this._prismaDb.testimonial.count({
          where: whereCondition,
        }),
      ]);

      return Promise.resolve(count[0] == 1);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'existsById', {
          includeData,
          testimonialId,
        }),
        error.message,
      );
      throw error;
    }
  }

  async update(
    currentUserId: string,
    testimonialId: number,
    testimonialData: any
  ): Promise<boolean> {
    try {
      const testimonialUpdated = await this.executeQueries<Testimonial>([
        this._prismaDb.testimonial.update({
          where: {
            testimonialId: testimonialId,
          },
          data: {
            content: testimonialData.content.trim(),
            updateByIdFk: currentUserId,
            updateAt: new Date(),
            disabled: false
          },
        }),
      ]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'update', { currentUserId, testimonialId, testimonialData }),
        error.message,
      );
      throw error;
    }
  }

  async like(testimonialId: number): Promise<boolean> {
    try {
      const testimonialUpdated = await this.executeQueries<Testimonial>([
        this._prismaDb.testimonial.update({
          where: {
            testimonialId: testimonialId,
          },
          data: {
            numberOfLike: { increment: 1 }
          },
        }),
      ]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'like', { testimonialId: testimonialId }),
        error.message,
      );
      throw error;
    }
  }

  async unlike(testimonialId: number): Promise<boolean> {
    try {
      const testimonialUpdated = await this.executeQueries<Testimonial>([
        this._prismaDb.testimonial.update({
          where: {
            testimonialId: testimonialId,
          },
          data: {
            numberOfLike: { decrement: 1 }
          },
        }),
      ]);

      return Promise.resolve(true);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'like', { testimonialId: testimonialId }),
        error.message,
      );
      throw error;
    }
  }

  async delete(currentUserId: string, testimonialId: number): Promise<number> {
    try {
      const testimonialDeleted = await this.executeQueries<Testimonial>([
        this._prismaDb.testimonial.update({
          data: {
            disabled: true,
            updateByIdFk: currentUserId,
          },
          where: {
            testimonialId: testimonialId
          },
          select: {
            testimonialId: true,
          },
        }),
      ]);

      return Promise.resolve(testimonialDeleted[0].testimonialId);
    } catch (error: any) {
      console.log(error);
      LogService.getInstance().create(
        LogTypeError.Error,
        new ErrorServiceModel(serviceName, 'delete', { currentUserId, testimonialId }),
        error.message,
      );
      throw error;
    }
  }
}

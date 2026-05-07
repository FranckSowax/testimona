import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { UserInfoModel } from 'src/app/shared/models/user-info.model';
import { MemorialMinimalModel } from '../../home/models/memorial.model';
import { MyTestimonialsModel } from '../models/my-testimonials.model';
import { MyTestimonialsService } from './my-testimonials.service';

@Injectable({
  providedIn: 'root',
})
export class MyTestimonialsDatastoreService {
  private _privateErrorMyTestimonialsDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorMyTestimonialsDatastore$ = this._privateErrorMyTestimonialsDatastore$.asObservable();

  constructor(private myTestimonialsService: MyTestimonialsService) { }

  async getMyTestimonialsList(): Promise<MyTestimonialsModel[] | null> {
    return this.myTestimonialsService.getList().then((myTestimonialsResult: ApiObjectResponseModel) => {
      if (!myTestimonialsResult.result.success) {
        this._privateErrorMyTestimonialsDatastore$.next(myTestimonialsResult.result.error);
        return Promise.resolve(null);
      }
      const returnArray = new Array<MyTestimonialsModel>();
      myTestimonialsResult.data.forEach((element: { id: number; content: string; numberOfLike: number; createDate: Date, memorialInfo: MemorialMinimalModel, userInfo: UserInfoModel }) => {
        returnArray.push(new MyTestimonialsModel(
          element.id,
          element.content,
          element.numberOfLike,
          element.createDate,
          element.memorialInfo,
          element.userInfo
        ),
        )
      })
      return Promise.resolve(returnArray);
    });
  }

}

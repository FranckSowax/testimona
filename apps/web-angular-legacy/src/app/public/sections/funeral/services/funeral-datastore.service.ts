import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { FuneralService } from './funeral.service';
import { FuneralCreateEditModel } from '../models/funeral-create-edit.model'
import { FuneralModel } from '../models/funeral.model'
import { UserInfoModel } from 'src/app/shared/models/user-info.model';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { FuneralEventCreateModel } from '../models/funeral-event-create.model';
import { FuneralEventModel } from '../models/funeral-event.model';
import { UserInfoMinimalModel } from 'src/app/shared/models/user-info-minimal.model';
import { FuneralEventEditModel } from '../models/funeral-event-edit.model';
import { FuneralEventGetModel } from '../models/funeral-event-get.model';


@Injectable({
  providedIn: 'root',
})

export class FuneralDatastoreService {
  private _privateErrorFuneralDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorFuneralDatastore$ = this._privateErrorFuneralDatastore$.asObservable();

  constructor(private funeralService: FuneralService) { }

  async createFuneral(
    funeralCreateModel: FuneralCreateEditModel,
    memorialId: number
  ): Promise<FuneralModel | null> {
    const createResult = await this.funeralService.create(funeralCreateModel, memorialId);

    if (!createResult.result.success) {
      this._privateErrorFuneralDatastore$.next(createResult.result.error);
      return Promise.resolve(null);
    }

    return Promise.resolve(
      new FuneralModel(
        createResult.data.id,
        '',
        createResult.data.createDate,
        null,
        new UserInfoModel('','','')
      ),
    );
  }

  async createEventFuneral(
    funeralEventCreateModel: FuneralEventCreateModel,
    memorialId: number
  ): Promise<FuneralEventModel | null> {
    const createEventResult = await this.funeralService.createEvent(funeralEventCreateModel, memorialId);

    if (!createEventResult.result.success) {
      this._privateErrorFuneralDatastore$.next(createEventResult.result.error);
      return Promise.resolve(null);
    }

    return Promise.resolve(
      new FuneralEventModel(
        createEventResult.data.id,
        memorialId,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        createEventResult.data.createDate,
        '',
        '',
        new UserInfoMinimalModel('',''),
      )
    );
  }

  async getFuneralEventList(memorialId: number): Promise<FuneralEventModel[] | null> {
    return this.funeralService.getEvents(memorialId).then((funeralEventsResult: ApiObjectResponseModel) => {
      if (!funeralEventsResult.result.success) {
        this._privateErrorFuneralDatastore$.next(funeralEventsResult.result.error);
        return Promise.resolve(null);
      }

      const returnArray = new Array<FuneralEventModel>();
      funeralEventsResult.data.forEach((element: { id: number; memorialId: number; title: string, date: string, startHour: string, startHourPeriod: string, endHour: string, endHourPeriod: string, url: string, note: string, location: string, createDate: string; updateDate: string; userInfo: { userId: string, identity: string } }) => {
        returnArray.push(new FuneralEventModel(
          element.id,
          memorialId,
          element.title,
          element.date,
          element.startHour,
          element.startHourPeriod,
          element.endHour,
          element.endHourPeriod,
          element.url,
          element.note,
          element.location,
          element.createDate,
          element.updateDate,
          new UserInfoMinimalModel(element.userInfo.userId, element.userInfo.identity),
        ),
        )
      })
      return Promise.resolve(returnArray);
    });
  }

  getFuneral(memorialId: number): Observable<FuneralModel | null> {
    return new Observable((newOb) => {
      this.funeralService.get(memorialId).then((funeralResult: ApiObjectResponseModel) => {
        if (!funeralResult.result.success) {
          this._privateErrorFuneralDatastore$.next(funeralResult.result.error);
          return newOb.next(null);
        }
        if (funeralResult.data == null) {
          return newOb.next(null)
        }
        return newOb.next(
          new FuneralModel(
            funeralResult.data.id,
            funeralResult.data.content,
            funeralResult.data.createDate,
            funeralResult.data.updateDate,
            new UserInfoModel(funeralResult.data.userInfo.userId, funeralResult.data.userInfo.identity, funeralResult.data.userInfo.relathionship)
          ),
        );
      })
    });
  }


  getFuneralEvent(funeralEventId: number): Observable<FuneralEventGetModel | null> {
    return new Observable((newOb) => {
      this.funeralService.getFuneralEvent(funeralEventId).then((funeralResult: ApiObjectResponseModel) => {
        if (!funeralResult.result.success) {
          this._privateErrorFuneralDatastore$.next(funeralResult.result.error);
          return newOb.next(null);
        }
        if (funeralResult.data == null) {
          return newOb.next(null)
        }
        return newOb.next(
          new FuneralEventGetModel(
            funeralResult.data.id,
            funeralResult.data.title,
            funeralResult.data.date,
            funeralResult.data.startHour,
            funeralResult.data.startHourPeriod,
            funeralResult.data.endHour,
            funeralResult.data.endHourPeriod,
            funeralResult.data.url,
            funeralResult.data.note,
            funeralResult.data.location,
          ),
        );
      })
    });
  }

  async editFuneral(memorialId: number, funeralItem: FuneralCreateEditModel): Promise<boolean> {
    const editResult = await this.funeralService.update(funeralItem, memorialId);

    if (!editResult.result.success) {
      this._privateErrorFuneralDatastore$.next(editResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }

  async editFuneralEvent(funeralId: number, funeralEventItem: FuneralEventEditModel): Promise<boolean> {
    const editResult = await this.funeralService.updateEvent(funeralEventItem, funeralId);

    if (!editResult.result.success) {
      this._privateErrorFuneralDatastore$.next(editResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }

  async deleteFuneralEvent(funeralId: number): Promise<boolean> {
    const deleteResult = await this.funeralService.deleteEvent(funeralId);

    if (!deleteResult.result.success) {
      this._privateErrorFuneralDatastore$.next(deleteResult.result.error);
      return Promise.resolve(false);
    }
    return Promise.resolve(
      true
    );
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserTestimonaModel } from 'src/app/core/models/user-testimona.model';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ApiObjectResponseModel } from 'src/app/shared/models/api-response.model';
import { PhotoObjectModel } from '../../photo/models/photo.model';
import { MemorialCreateModel, MemorialModel } from '../models/memorial.model';
import { TestimonaCreateModel, TestimonaModel } from '../models/testimona-create.model';
import { TestimonaService } from './testimona.service';

@Injectable({
  providedIn: 'root',
})
export class TestimonaDatastoreService {
  private _privateErrorTestimonaDatastore$ = new BehaviorSubject<ApiResultResponseEnum>(
    ApiResultResponseEnum.NoError,
  );
  ErrorTestimonaDatastore$ = this._privateErrorTestimonaDatastore$.asObservable();

  constructor(private testimonaService: TestimonaService) { }

  async createTestimona(
    memorialId: number,
    testimonaModel: TestimonaCreateModel
  ): Promise<TestimonaModel | null> {
    const createResult = await this.testimonaService.create(memorialId, testimonaModel);

    if (!createResult.result.success) {
      this._privateErrorTestimonaDatastore$.next(createResult.result.error);
      return Promise.resolve(null);
    }

    return Promise.resolve(
      new TestimonaModel(
        createResult.data.id,
        testimonaModel.content,
        createResult.data.createDate,
        createResult.data.createDate,
        null
      ),
    );
  }

  async createMemorial(
    memorialModel: MemorialCreateModel,
  ): Promise<MemorialModel | null> {
    const createResult = await this.testimonaService.createMemorial(memorialModel);
    if (!createResult.result.success) {
      this._privateErrorTestimonaDatastore$.next(createResult.result.error);
      return Promise.resolve(null);
    }

    return Promise.resolve(
      new MemorialModel(
        createResult.data.id,
        createResult.data.url,
        '',
        '',
        0,
        0,
        0,
        '',
        null,
        0,
        0,
        0,
        '',
        null,
        '',
        '',
      ),
    );
  }
}

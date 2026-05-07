import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@ngneat/transloco';
import { filter } from 'lodash-es';
import { Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { MenuMemorialEnum } from 'src/app/shared/enums/menu-memorial.enum';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { RelativesEnum } from 'src/app/shared/enums/relatives.enum';
import { EnumHelpers } from 'src/app/shared/helpers/enum.helper';
import { KeyValuePairModel } from 'src/app/shared/models/key-value-pair.model';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';
import { MenuMemorialService } from 'src/app/shared/services/menu-memorial.service';
import { TestimonaCreateModalModel } from '../../models/testimona-create.model';
import { TestimonaListModel } from '../../models/testimona.model';
import { TestimonaDatastoreService } from '../../services/testimona.datastore.service';

@Component({
  selector: 'app-list-testimona',
  templateUrl: './list-testimona.component.html',
  styleUrls: ['./list-testimona.component.scss']
})
export class TestimonaListComponent implements OnInit, OnDestroy {
  @Input('memorialId') memorialId: number;
  @Input('memorialUrl') memorialUrl: string;
  @Input('memorialUserRelathionship') memorialUserRelathionship: string;

  public loadingDone: boolean;
  public loadMoreResult: boolean;
  public listOfTestimona: TestimonaListModel[];

  public displayCreateTestimona: boolean = false;
  public displayEditTestimona: boolean;

  public editTestimonaModalViewModel: ModalViewModel;
  public createTestimonaModalViewModel: ModalViewModel;

  public createTestimonaModalModel: TestimonaCreateModalModel;

  public relatives: Array<KeyValuePairModel>;

  public testimonialId: number;

  private pageSize: number = 8;
  private pageIndex: number = 0;

  private _subscriptions = new Subscription();

  constructor(private testimonaDatastoreService: TestimonaDatastoreService, private modalDatastoreService: ModalDatastoreService,
              private router: Router, private translocoService: TranslocoService, private menuMemorialService: MenuMemorialService) { }

  ngOnInit(): void {
    this._subscriptions.add(this.translocoService.langChanges$.subscribe((newLang: string) => {
        const relativeTranslation = this.translocoService.translateObject("relatives");
        this.relatives = EnumHelpers.getEnumDropDownList(RelativesEnum, relativeTranslation);
      })
    );
    this.createTestimonaModalModel = new TestimonaCreateModalModel(this.memorialId, this.memorialUrl, EnumHelpers.getEnumKeyValue(RelativesEnum, this.memorialUserRelathionship));

    this._subscriptions.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;

        if (modal.id == ModalNameEnum.CreateTestimona) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayCreateTestimona = modal.state == ModalStateEnum.Opened;
          } else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.displayCreateTestimona = false;
            (async () => {
              await this.initializeList();
              this.menuMemorialService.SelectTab(MenuMemorialEnum.Testimonial);
            })();
          }
        } else if (modal.id == ModalNameEnum.EditTestimona) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayEditTestimona = modal.state == ModalStateEnum.Opened;
          }
          else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.testimonialId = 0;
            this.displayEditTestimona = false;
            (async () => {
              await this.initializeList();
            })();
          }
        }
      },
        (error) => {
          console.log(error);
          this.router.navigate(['/404'])
          this.loadingDone == true;
        })
    );

    this.createTestimonaModalViewModel = new ModalViewModel(ModalNameEnum.CreateTestimona, ModalStateEnum.Closed);
    this.editTestimonaModalViewModel = new ModalViewModel(ModalNameEnum.EditTestimona, ModalStateEnum.ClosedAndRefreshed);

    (async () => {
      await this.initializeList();
    })();
  }

  ngOnDestroy(): void {
      this._subscriptions.unsubscribe();
  }

  private async initializeList() {
    this.loadingDone = false;

    this.pageIndex = 0;
    const listOfTestimona = await this.testimonaDatastoreService.getTestimonaList(this.memorialId, this.pageIndex, this.pageSize);
    if (listOfTestimona && listOfTestimona.length > 0) {
      this.pageIndex++;
      this.listOfTestimona = new Array<TestimonaListModel>();
      this.listOfTestimona.push(...listOfTestimona);
    }

    this.loadingDone = true;
  }

  async onScroll() {
    this.loadMoreResult = true;

    const listOfTestimona = await this.testimonaDatastoreService.getTestimonaList(this.memorialId, this.pageIndex, this.pageSize);
    if (listOfTestimona && listOfTestimona.length > 0) {
      this.pageIndex++;
      this.listOfTestimona.push(...listOfTestimona);
    }

    this.loadMoreResult = false;
  }

  editOnClick(testimonialId: number): void {
    this.testimonialId = testimonialId;
  }

  async deleteOnClick(testimonialId: number): Promise<void> {
    this.testimonialId = testimonialId;
    const result = await this.testimonaDatastoreService.deleteTestimona(testimonialId);
      if (result) {
        this.listOfTestimona = filter(this.listOfTestimona, (item: TestimonaListModel) => item.id != testimonialId);
      }
  }
}

import { Location } from '@angular/common';
import { AfterContentChecked, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { TranslocoService } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, AfterContentChecked, OnDestroy {
  assetUrl = environment.assetUrl;
  imageName: string;

  displayCreateMemorial: boolean = false;
  createMemorialModalViewModel: ModalViewModel;

  displayCreateTestimona: boolean = false;
  createTestimonaModalViewModel: ModalViewModel;

  displayActivateUser: boolean = false;
  activateUserModalViewModel: ModalViewModel;
  userId: string = '';

  private modalToOpen: ModalNameEnum;
  private _subscriptions = new Subscription();

  constructor(private translocoService: TranslocoService, private modalDatastoreService: ModalDatastoreService,
              private profileInfosService: ProfileInfosService, private activatedRoute: ActivatedRoute, private location: Location) {}

  ngOnInit(): void {
    this.createMemorialModalViewModel = new ModalViewModel(ModalNameEnum.CreateMemorial, ModalStateEnum.Closed);
    this.createTestimonaModalViewModel = new ModalViewModel(ModalNameEnum.CreateTestimonaHome, ModalStateEnum.Closed);
    this.activateUserModalViewModel = new ModalViewModel(ModalNameEnum.ActivateUser, ModalStateEnum.Closed);

    this._subscriptions.add(
      this.translocoService.langChanges$.subscribe((newLang: string) => {
        this.imageName = `presentation-${newLang}.png`;
      })
    );

    this._subscriptions.add(
      this.activatedRoute.params.subscribe((params: Params) => {
        if (params.userId != undefined && params.userId != null && params.userId.toString().trim() != '') {
          this.userId = params.userId.toString().trim();
        }
      })
    );

    this._subscriptions.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;

        if (modal.id == ModalNameEnum.CreateMemorial) {
          this.displayCreateMemorial = modal.state == ModalStateEnum.Opened;
        }

        if (modal.id == ModalNameEnum.CreateTestimonaHome) {
          this.displayCreateTestimona = modal.state == ModalStateEnum.Opened;
        }

        if (modal.id == ModalNameEnum.ActivateUser) {
          this.displayActivateUser = modal.state == ModalStateEnum.Opened;
        }

        // Signin or Register
        if (modal.id == ModalNameEnum.Signin || modal.id == ModalNameEnum.Register) {
          if (modal.closingState && modal.closingState == ModalStateEnum.ClosedAndReOpen) {
            if (this.profileInfosService.IsLoggedIn$().getValue()) {
              if (this.modalToOpen == ModalNameEnum.CreateMemorial) {
                this.createMemorial();
                return;
              }

              if (this.modalToOpen == ModalNameEnum.CreateTestimonaHome) {
                this.createTestimona();
                return;
              }
            }
          }
        }
      })
    );
  }

  ngAfterContentChecked(): void {
    if (this.userId != undefined && this.userId != null && this.userId != '') {
      this.modalDatastoreService.open(ModalNameEnum.ActivateUser);
      this.location.replaceState('/');
    }
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
  }

  createMemorial() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalToOpen = ModalNameEnum.CreateMemorial;
      this.modalDatastoreService.open(ModalNameEnum.Signin, ModalStateEnum.ClosedAndReOpen);
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.CreateMemorial);
  }

  createTestimona() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalToOpen = ModalNameEnum.CreateTestimonaHome;
      this.modalDatastoreService.open(ModalNameEnum.Signin, ModalStateEnum.ClosedAndReOpen);
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.CreateTestimonaHome);
  }
}

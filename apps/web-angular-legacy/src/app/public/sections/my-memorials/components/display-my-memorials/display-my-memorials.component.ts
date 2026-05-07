import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { combineLatest, Subscription } from 'rxjs';
import { MyMemorialsDatastoreService } from '../../services/my-memorials-datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { MyMemorialsModel } from '../../models/my-memorials.model';
import { environment } from 'src/environments/environment';
import { ConfigurationDatastoreService } from 'src/app/shared/datastores/configuration.datastore.service';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { CountryMemorialModel } from 'src/app/shared/models/country-memorial.model';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';

@Component({
  selector: 'app-display-my-memorials',
  templateUrl: './display-my-memorials.component.html',
  styleUrls: ['./display-my-memorials.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'mymemorials' }
    },
  ],
})

export class DisplayMyMemorialsComponent implements OnInit, OnDestroy{
  private _subscriptions = new Subscription();
  public errorListMyMemorials: string;
  public listOfMyMemorials: MyMemorialsModel[];
  public loadingDone: boolean = false;
  public assetUrl = environment.assetUrl;
  public countries = new Array<CountryMemorialModel>();
  public countryOfDeathMemorial: string;
  public countryOfDeathCode: number;
  public listOfMyMemorialsLength: number;
  public modalToOpen: ModalNameEnum;

  displayCreateMemorial: boolean = false;
  createMemorialModalViewModel: ModalViewModel;

  constructor(
    private myMemorialsDatastoreService: MyMemorialsDatastoreService,
    private router: Router,
    private translocoService: TranslocoService,
    private configurationDatastoreService: ConfigurationDatastoreService,
    private appShellService: AppShellService,
    private modalDatastoreService: ModalDatastoreService,
    private profileInfosService: ProfileInfosService
  ) { }

  ngOnInit(): void {
    this.createMemorialModalViewModel = new ModalViewModel(ModalNameEnum.CreateMemorial, ModalStateEnum.Closed);

    this._subscriptions.add(
      this.myMemorialsDatastoreService.ErrorMyMemorialsDatastore$.subscribe((errorResult) => {
        this.errorListMyMemorials = '';
        if (errorResult != ApiResultResponseEnum.NoError) {
          switch (errorResult) {
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.DataNotFound:
              this.router.navigate(["404"]);
              break;
            default:
              this.errorListMyMemorials = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );

    this._subscriptions.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;

        if (modal.state == ModalStateEnum.Opened) {
          if (modal.id == ModalNameEnum.CreateMemorial) {
            this.displayCreateMemorial = modal.state == ModalStateEnum.Opened;
          }
        }

        // Signin or Register
        if (modal.state == ModalStateEnum.Closed) {
          if (modal.id == ModalNameEnum.Signin || modal.id == ModalNameEnum.Register) {
            if (modal.closingState && modal.closingState == ModalStateEnum.ClosedAndReOpen) {
              if (this.profileInfosService.IsLoggedIn$().getValue()) {
                if (this.modalToOpen == ModalNameEnum.CreateMemorial) {
                  this.createMemorial();
                  return;
                }
              }
            }
          }
        }
      })
    );

    (async () => {
      const memorialConfiguration = await this.configurationDatastoreService.memorialConfiguration(this.appShellService.getActiveLanguage());
      this.countries = memorialConfiguration.countries.sort((a, b) => a.code.localeCompare(b.code));
      combineLatest([
        this.myMemorialsDatastoreService.getMyMemorialsList(),
        this.translocoService.load(`countries/${this.appShellService.getActiveLanguage()}`),
      ])
        .subscribe(([listOfMyMemorials, countriesData]) => {
          listOfMyMemorials.forEach((myMemorial) => {
            myMemorial.countryOfDeathName = countriesData[myMemorial.countryOfDeath.code];
            this.countryOfDeathCode = myMemorial.countryOfDeath.id;
          })
          this.listOfMyMemorials = listOfMyMemorials;
          this.listOfMyMemorialsLength = listOfMyMemorials.length;
          this.loadingDone = true;
        },
          (err) => {
            console.log(err);
            this.loadingDone = true;
          });
    })();
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

}

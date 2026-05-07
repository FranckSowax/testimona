import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { MemorialAdminModel, MemorialCurrentUserModel, MemorialModel } from '../../models/memorial.model';
import { MemorialDatastoreService } from "../../services/memorial-datastore.service"
import { TRANSLOCO_SCOPE, TranslocoService } from '@ngneat/transloco';
import { environment } from 'src/environments/environment';
import { combineLatest, Subscription } from 'rxjs';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { Clipboard } from '@angular/cdk/clipboard';
import { DateHelpers } from 'src/app/shared/helpers/date.helper';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { map } from 'lodash-es';
import { ImportFile } from 'src/app/shared/components/upload-media/upload-media.component';
import { UploadObjectType } from 'src/app/shared/models/upload-media.model';
import { PhotoDatastoreService } from '../../../photo/services/photo-datastore.service';
import { PhotoModelMemorialPicture } from '../../../photo/models/photo.model';
import { Location } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-display-memorial',
  templateUrl: './display-memorial.component.html',
  styleUrls: ['./display-memorial.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'memorial' }
    }
  ],
})
export class MemorialDisplayComponent implements OnInit, OnDestroy {
  public assetUrl = environment.assetUrl;
  public memorialURL: string;
  public displayedMemorial: MemorialModel | null;
  public adminList: MemorialAdminModel[] = null;
  public currentRelationship: MemorialCurrentUserModel | null;

  public displayEditMemorial: boolean = false;
  public displayAdminMemorial: boolean = false;
  public displayDonationSuccess: boolean = false;
  public displayDonationFailed: boolean = false;

  public editMemorialModalViewModel: ModalViewModel;
  public adminMemorialModalViewModel: ModalViewModel;
  public donationSuccessModalViewModel: ModalViewModel;
  public donationFailedModalViewModel: ModalViewModel;

  public donationId: string;

  public countryOfDeath: string = "";
  public countryOfBirth: string = "";
  public loadingDone: boolean = false;
  public errorGetMemorial: string;

  public acceptedFiles = 'image/png, image/jpeg';

  @ViewChild('uploadInput', { static: false }) uploadInput: ElementRef<HTMLInputElement>;
  @ViewChild('uploadInputBack', { static: false }) uploadInputBack: ElementRef<HTMLInputElement>;

  public currentFiles: Array<ImportFile> = new Array<ImportFile>();
  public profilePictureUrl: String = null;
  public profilePictureArray: Array<PhotoModelMemorialPicture> = new Array<PhotoModelMemorialPicture>();
  public backgroundPictureUrl: String = null;
  public backgroundPictureArray: Array<PhotoModelMemorialPicture> = new Array<PhotoModelMemorialPicture>();

  private _subscriptions = new Subscription();

  constructor(
    private activatedRoute: ActivatedRoute,
    private translocoService: TranslocoService,
    private memorialDatastoreService: MemorialDatastoreService,
    private profileInfosService: ProfileInfosService,
    private modalDatastoreService: ModalDatastoreService,
    private appShellService: AppShellService,
    private router: Router,
    private photoDatastoreService: PhotoDatastoreService,
    private clipboard: Clipboard,
    private location: Location,
    private _snackBar: MatSnackBar
    ) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe((params: Params) => {
      if (this.memorialURL != params.url.toString()) {
        this.resetPage();
        this.memorialURL = params.url.toString();

        if (params.donationId != undefined && params.donationId != null && params.donationId.toString().trim() != '') {
          this.donationId = params.donationId.toString().trim();
        }

        this.loadingPage(this.appShellService.getActiveLanguage(), true);
      }
    });

    this.translocoService.langChanges$.subscribe((lang: string) => {
      if (this.appShellService.getActiveLanguage() != lang) {
        this.loadingPage(lang, false);
      }
    });

    this.adminMemorialModalViewModel = new ModalViewModel(ModalNameEnum.AdminMemorial, ModalStateEnum.Closed);
    this.editMemorialModalViewModel = new ModalViewModel(ModalNameEnum.EditMemorial, ModalStateEnum.Closed);

    this._subscriptions.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;

        if (modal.id == ModalNameEnum.EditMemorial) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayEditMemorial = modal.state == ModalStateEnum.Opened;
          }
          else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.loadingPage(this.appShellService.getActiveLanguage(), true);
          }
        } else if (modal.id == ModalNameEnum.AdminMemorial) {
          this.displayAdminMemorial = modal.state == ModalStateEnum.Opened;
        } else if (modal.id == ModalNameEnum.SuccessDonation) {
          this.displayDonationSuccess = modal.state == ModalStateEnum.Opened;
        } else if (modal.id == ModalNameEnum.FailedDonation) {
          this.displayDonationFailed = modal.state == ModalStateEnum.Opened;
        }
      },
      (error) => {
        console.log(error);
        this.router.navigate(['/404'])
        this.loadingDone == true;
      })
    );

    this._subscriptions.add(
      this.memorialDatastoreService.ErrorMemorialDatastore$.subscribe((errorResult) => {
        this.errorGetMemorial = '';
        if (errorResult != ApiResultResponseEnum.NoError) {
          switch(errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.DataNotFound:
              this.router.navigate(["404"]);
              break;
            default:
              this.errorGetMemorial = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );
  }

  ngOnDestroy() {
    this._subscriptions.unsubscribe();
  }

  private resetPage(): void {
    this.memorialURL = '';
    this.displayedMemorial = null;
    this.adminList = null;
    this.currentRelationship = null;

    this.displayEditMemorial = false;
    this.displayAdminMemorial = false;

    this.adminMemorialModalViewModel = new ModalViewModel(ModalNameEnum.AdminMemorial, ModalStateEnum.Closed);
    this.editMemorialModalViewModel = new ModalViewModel(ModalNameEnum.EditMemorial, ModalStateEnum.Closed);
    this.donationFailedModalViewModel = new ModalViewModel(ModalNameEnum.FailedDonation, ModalStateEnum.Closed);
    this.donationSuccessModalViewModel = new ModalViewModel(ModalNameEnum.SuccessDonation, ModalStateEnum.Closed);

    this.countryOfDeath = "";
    this.countryOfBirth = "";
    this.loadingDone = false;
    this.errorGetMemorial = '';

    this.currentFiles = new Array<ImportFile>();
    this.profilePictureUrl = null;
    this.profilePictureArray = new Array<PhotoModelMemorialPicture>();
    this.backgroundPictureUrl = null;
    this.backgroundPictureArray = new Array<PhotoModelMemorialPicture>();
  }

  private loadingPage(currentLanguage: string, urlChanged: boolean): void {
    if (urlChanged) {
      this.loadingDone = false;
    }
    this.errorGetMemorial = '';
    combineLatest([
      this.memorialDatastoreService.getMemorial(this.memorialURL),
      this.translocoService.load(`countries/${currentLanguage}`),
    ])
    .subscribe(([memorialItem, countriesData]) => {
      if (memorialItem != null) {
        combineLatest([
          this.memorialDatastoreService.getMemorialAdminList(memorialItem.url),
          this.memorialDatastoreService.getMemorialUserRelationship(memorialItem.id),
          this.photoDatastoreService.getPhotosForMemorialPicture('MemorialProfile', memorialItem.id),
          this.photoDatastoreService.getPhotosForMemorialPicture('MemorialBackground', memorialItem.id)
        ])
        .subscribe(([adminList, userRelationship, profilePhoto, backgroundPhoto]) => {
          this.countryOfDeath = countriesData[memorialItem.countryOfDeath.code];
          this.countryOfBirth = countriesData[memorialItem.countryOfBirth.code];
          this.currentRelationship = userRelationship;
          if (profilePhoto != null) {
            this.profilePictureArray = profilePhoto
            this.profilePictureUrl = profilePhoto[profilePhoto.length - 1].urls.circle
          }
          if (backgroundPhoto != null) {
            this.backgroundPictureArray = backgroundPhoto
            this.backgroundPictureUrl = backgroundPhoto[backgroundPhoto.length - 1].urls.full
          }

          this.adminList = new Array<MemorialAdminModel>();
          if (adminList) {
            adminList.forEach((admin) => {
              if (admin.isAdmin == true) {
                this.adminList.push(admin)
              }
            });
          }

          this.displayedMemorial = memorialItem;
          this.loadingDone = true;

          setTimeout(() => {
            if (this.router.url.toLowerCase().includes('success') || this.router.url.toLowerCase().includes('failed')) {
              let partUrlToDelete = '';
              if (this.router.url.toLowerCase().includes('success') && this.donationId != '') {
                partUrlToDelete = '/success/';
                this.donationSuccessModalViewModel = new ModalViewModel(ModalNameEnum.SuccessDonation, ModalStateEnum.Closed);
                this.modalDatastoreService.open(ModalNameEnum.SuccessDonation);
              } else {
                partUrlToDelete = '/failed/';
                this.donationFailedModalViewModel = new ModalViewModel(ModalNameEnum.FailedDonation, ModalStateEnum.Closed);
                this.modalDatastoreService.open(ModalNameEnum.FailedDonation);
              }
              this.location.replaceState(this.router.url.replace(partUrlToDelete + this.donationId, ''));
            }
          }, 1500);
        })
      }
    },
    (err) => {
      console.log(err);
      this.loadingDone = true;
      this.router.navigate(["404"]);
    });
  }

  getListOfAdminUsers(): string {
    let stringToReturn;
    if (this.adminList) {
      stringToReturn = map(this.adminList, (adm) => { return adm.identity }).join(', ');
    }

    return stringToReturn;
  }

  getMemorialDateOfDeath(): string {
    let stringToReturn = this.displayedMemorial.yearOfDeath.toString();

    if (this.displayedMemorial.monthOfDeath > 0) {
      stringToReturn += "-" + DateHelpers.addZero(this.displayedMemorial.monthOfDeath);

      if (this.displayedMemorial.dayOfDeath > 0) {
        stringToReturn += "-" + DateHelpers.addZero(this.displayedMemorial.dayOfDeath);
      }
    }

    return stringToReturn;
  }

  getMemorialDateOfBirth(): string {
    let stringToReturn = this.displayedMemorial.yearOfBirth.toString();

    if (this.displayedMemorial.monthOfBirth > 0) {
      stringToReturn += "-" + DateHelpers.addZero(this.displayedMemorial.monthOfBirth);

      if (this.displayedMemorial.dayOfBirth > 0) {
        stringToReturn += "-" + DateHelpers.addZero(this.displayedMemorial.dayOfBirth);
      }
    }

    return stringToReturn;
  }

  editMemorial() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    if (this.currentRelationship.isAdmin == false) {
      this.adminMemorial();
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.EditMemorial);
  }

  shareMemorial() {
    this.clipboard.copy(location.href);
    this._snackBar.open(this.translocoService.translate('memorial.memorial.tooltip.copied'), '', {
      duration: 3000
    });
  }

  adminMemorial() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }
    this.modalDatastoreService.open(ModalNameEnum.AdminMemorial);
  }

  createTestimona() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.CreateTestimona);
  }

  async addProfilePicture() {
    if (this.profilePictureArray.length > 0) {
      await this.photoDatastoreService.deletePhotos(this.profilePictureArray[0].photoId);
    }
    const fileToImport = this.uploadInput.nativeElement.files;
    const resultAddPhotos = await this.addFile(UploadObjectType.MemorialProfile, fileToImport)

    if (resultAddPhotos) {
      const arrayPictureProfile = await this.photoDatastoreService.getPhotosForMemorialPicture('MemorialProfile', this.displayedMemorial.id);
      this.profilePictureArray = arrayPictureProfile;
      this.profilePictureUrl = arrayPictureProfile[arrayPictureProfile.length - 1].urls.circle;
    }
  }

  async addBackgroundPicture() {
    if (this.backgroundPictureArray.length > 0) {
      await this.photoDatastoreService.deletePhotos(this.backgroundPictureArray[0].photoId);
    }
    const fileToImport = this.uploadInputBack.nativeElement.files;
    const resultAddPhotos = await this.addFile(UploadObjectType.MemorialBackground, fileToImport);

    if (resultAddPhotos) {
      const arrayPictureBackground = await this.photoDatastoreService.getPhotosForMemorialPicture('MemorialBackground', this.displayedMemorial.id);
      this.backgroundPictureArray = arrayPictureBackground;
      this.backgroundPictureUrl = arrayPictureBackground[arrayPictureBackground.length - 1].urls.full
    }
  }

  async addFile(objectType: UploadObjectType, fileToImport: FileList): Promise<boolean> {

    const newArray = map(fileToImport, (fileToImport) => { return { filename: fileToImport.name, photoUrl: '', fileData: fileToImport }; });
    const photoToAdd = newArray.filter((ite) => (ite.fileData != null && ite.fileData != undefined)).map((ite) => ite.fileData)

    return await this.addPhoto(this.displayedMemorial.id, photoToAdd, objectType);
  }

  private async addPhoto(memorialId: number, fileToUpload: Array<File>, objectType: UploadObjectType): Promise<boolean> {
    const formData = new FormData(); 
    formData.append('objectId', memorialId.toString());
    formData.append('objectType', objectType);

    formData.append('previousFilesData', JSON.stringify({ previousName: '' }));
    formData.append('file', fileToUpload[0])

    const newObjectPhoto = await this.photoDatastoreService.createPhoto(formData);
    if (newObjectPhoto) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }
}

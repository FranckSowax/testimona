import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, Validators, UntypedFormGroup } from '@angular/forms';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
// import { GoogleLoginProvider, SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { Subscription } from 'rxjs';
import { CoreDataStoreService } from '../../../datastores/core.datastore.service';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { AuthenticationTypeEnum } from 'src/app/shared/enums/auth-type.enum';
import { AuthenticationDataStoreService } from '../../../datastores/authentication.datastore.service';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ProfileInfosService } from '../../../../shared/datastores/profile-infos.datastore.service'
import { environment } from 'src/environments/environment';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';
import { Router } from '@angular/router';
// import { find } from 'lodash-es';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'authentication', alias: "auth" }
    }
  ]
})
export class SigninComponent implements OnInit, OnDestroy {
  public signInForm: UntypedFormGroup = new UntypedFormGroup({});
  public titleLogo: string = '';
  public textGoogleBtn: string = '';
  public errorMessage: string = "";
  public errorMessageSignIn: string = "";
  public hide: boolean = true;
  public assetUrl = environment.assetUrl;
  public submitInProgress = false;

  private closingModalState: ModalStateEnum;
  private _subscriptions = new Subscription();

  get formControls() {
    return this.signInForm.controls;
  }

  @HostListener('input')
    public onKeyUp(): void {
      this.errorMessage = '';
      this.signInForm.controls['email'].setErrors(null);
      this.signInForm.controls['password'].setErrors(null);
  }

  constructor(
    private formBuilder: UntypedFormBuilder,
    private authenticationDataStoreService: AuthenticationDataStoreService,
    // private socialAuthService: SocialAuthService,
    private coreDataStoreService: CoreDataStoreService,
    private appShellService: AppShellService,
    private modalDatastoreService: ModalDatastoreService,
    private profileInfoService: ProfileInfosService,
    private translocoService: TranslocoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.signInForm = this.formBuilder.group({
      email: [
        '',
        Validators.compose([
          Validators.required,
          Validators.pattern(
            /^[a-zA-Z0-9]+([a-zA-Z0-9._-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,15})$/
          ),
        ]),
      ],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });

    this._subscriptions.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;

        if (modal.id == ModalNameEnum.Signin && modal.state == ModalStateEnum.Opened) {
          this.closingModalState = modal.closingState ?? ModalStateEnum.Closed;
        } else if (modal.id == ModalNameEnum.Signin && modal.closingState == ModalStateEnum.ClosedAndRedirect && this.closingModalState == ModalStateEnum.ClosedAndRedirect) {
          this.router.navigate(['/mymemorials']);
        }
      })
    );

    // this._subscriptions.add(
    //   this.socialAuthService.authState.subscribe(async (socialAuth) => {
    //     if (socialAuth)
    //       await this.signInWithGoogle(socialAuth);
    //   })
    // );

    this._subscriptions.add(
      this.translocoService.selectTranslate('auth.signin.title_png_one')
        .subscribe((text) => this.titleLogo = `${this.assetUrl}authentication/${text}`)
    );

    this._subscriptions.add(
      this.translocoService.events$.pipe(filter((e: any) => e.type === 'translationLoadSuccess')).subscribe(() => {
        this.titleLogo = `${this.assetUrl}authentication/${this.translocoService.translate("auth.signin.title_png_one")}`;
      })
    );

    this._subscriptions.add(this.authenticationDataStoreService.ErrorAuthDatastore$.subscribe((error: ApiResultResponseEnum) => {
      if (error != ApiResultResponseEnum.NoError) {
        // Avoir avec Phillipe et Andrew si on affiche un message commun ou un message spécifique pour chaque erreur
        this.signInForm.controls['email'].setErrors({
          error: true,
        });
        this.signInForm.controls['password'].setErrors({
          error: true,
        });

        // "InvalidBodyData",
        // "DataNotFound",
        // "LoginFailed",
        // "CreateTokenFailed"
        this.errorMessage = this.translocoService.translate('auth.signin.error.default');
      }
    }));
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
  }

  async onSubmit() {
    this.submitInProgress = true
    const returnValue = await this.authenticationDataStoreService.authSite(this.formControls.email.value, this.formControls.password.value)
    if (returnValue) {
      this.profileInfoService.authenticateCurrentUser(
        returnValue.userId,
        returnValue.firstname,
        returnValue.lastname,
        returnValue.nickname,
        returnValue.displayName,
        returnValue.role,
        AuthenticationTypeEnum.Site,
        returnValue.language
      );
      this.closeModal(this.closingModalState);
    }
    this.submitInProgress = false
  }

  // async signInWithGoogle(socialAuth: SocialUser) {
  //   try {
  //     await this.coreDataStoreService.loggedSocialMedia(AuthenticationTypeEnum.Google, socialAuth, this.appShellService.getActiveLanguage()!);
  //     this.closeModal(this.closingModalState);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }

  closeModal(state: ModalStateEnum = ModalStateEnum.Closed) {
    this.closingModalState = state;
    this.authenticationDataStoreService.resetDataStore();
    this.modalDatastoreService.close(ModalNameEnum.Signin, state);
  }

  redirectSignUp() {
    this.closeModal();
    this.modalDatastoreService.open(ModalNameEnum.Register);
  }
}

import { Component, HostListener, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { DisplayProfileIdentityEnum } from 'src/app/shared/enums/display-profile-identity.enum';
import { UserRoleEnum } from 'src/app/shared/enums/user-role.enum';
import { SecurityQuestionModel } from 'src/app/shared/models/security-question.model';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { AuthenticationTypeEnum } from '../../../../shared/enums/auth-type.enum';
import { RegisterModel } from '../../../models/register.model';
import { AuthenticationDataStoreService } from '../../../datastores/authentication.datastore.service';
import { filter } from 'lodash-es';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ConfigurationDatastoreService } from 'src/app/shared/datastores/configuration.datastore.service';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalNameEnum } from 'src/app/shared/enums/modal.enum';
import { FormStateEnum } from 'src/app/shared/enums/form.enum';
// import { GoogleLoginProvider, SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { CoreDataStoreService } from '../../../datastores/core.datastore.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'authentication', alias: 'auth' },
    },
  ],
})
export class RegisterComponent implements OnInit {
  public assetUrl = environment.assetUrl;

  public userForm: UntypedFormGroup = new UntypedFormGroup({});

  public confirmPasswordIsNotValid: boolean = false;
  public hidePassword: boolean = true;
  public hideConfirmPassword: boolean = true;
  public securityQuestions = new Array<SecurityQuestionModel>();
  public securityQuestionsTwo = new Array<SecurityQuestionModel>();

  public errorMessage: string = '';

  public registerState: FormStateEnum;
  public formState = FormStateEnum;
  public submitInProgress = false;

  public displayProfileIdentityEnum = DisplayProfileIdentityEnum;
  public displayProfileIdentityChecked: DisplayProfileIdentityEnum;

  private subscription = new Subscription();

  get formControls() {
    return this.userForm.controls;
  }

  @HostListener('input')
    public onKeyUp(): void {
      this.errorMessage = '';
  }

  constructor(
    private configurationDatastoreService: ConfigurationDatastoreService,
    private profileInfoService: ProfileInfosService,
    private appShellService: AppShellService,
    private translocoService: TranslocoService,
    private formBuilder: UntypedFormBuilder,
    private authenticationDataStoreService: AuthenticationDataStoreService,
    private modalDatastoreService: ModalDatastoreService,
    // private socialAuthService: SocialAuthService,
    private coreDataStoreService: CoreDataStoreService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.getRegisterConfiguration();

    this.registerState = FormStateEnum.InProgress;

    this.subscription.add(
      this.translocoService.langChanges$.subscribe(
        (newLang: string) => {
          this.getRegisterConfiguration();
        }
      )
    )

    this.subscription.add(
      this.configurationDatastoreService.ErrorConfigurationDatastore$.subscribe(
        (apiError: ApiResultResponseEnum) => {
          this.errorMessage = this.setApiErrorMessage(apiError);
        },
      ),
    );

    this.subscription.add(
      this.authenticationDataStoreService.ErrorAuthDatastore$.subscribe(
        (apiError: ApiResultResponseEnum) => {
          this.errorMessage = this.setApiErrorMessage(apiError);
        },
      ),
    );

    // this.subscription.add(
    //   this.socialAuthService.authState.subscribe(async (socialAuth) => {
    //     if (socialAuth)
    //       await this.signUpWithGoogle(socialAuth);
    //   })
    // );
  }

  private initForm() {
    // Validations form
    this.userForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      nickname: ['', Validators.required],
      displayProfileIdentity: this.formBuilder.group({
        displayFirstname: [''],
        displayLastname: [''],
        displayNickname: [''],
      }, {
        validators: Validators.required
      }),
      email: [
        '',
        Validators.compose([
          Validators.required,
          Validators.pattern(
            /^[a-zA-Z0-9]+([a-zA-Z0-9._-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,15})$/,
          ),
        ])
      ],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      secretQuestion: ['', Validators.required],
      secretAnswer: ['', Validators.required],
      secretQuestionTwo: ['', Validators.required],
      secretAnswerTwo: ['', Validators.required],
    },
    {
      validator: this.mustMatch('password', 'confirmPassword')
    });

    this.displayProfileIdentityChecked = DisplayProfileIdentityEnum.none;
    this.userForm.controls['secretQuestionTwo'].disable();
    this.userForm.controls['secretAnswerTwo'].disable();

    this.userForm.get('email').valueChanges.pipe(debounceTime(750)).subscribe((newEmailValue: string) => this.onChangeEmail(newEmailValue));
  }

  private async getRegisterConfiguration() {
    // create register token
    await this.authenticationDataStoreService.register();

    const registerConfiguration = await this.configurationDatastoreService.registerConfiguration();
    if (!registerConfiguration) return;

    this.securityQuestions = registerConfiguration.securityQuestions;
    this.userForm.controls['secretQuestion'].setValue("");
    this.userForm.controls['secretAnswer'].setValue("");
    this.userForm.controls['secretQuestionTwo'].setValue("");
    this.userForm.controls['secretAnswerTwo'].setValue("");
    this.userForm.controls['secretQuestionTwo'].disable();
    this.userForm.controls['secretAnswerTwo'].disable();
  }

  private mustMatch(controlName: string, matchingControlName: string) {
    return (formGroup: UntypedFormGroup) => {
        const control = formGroup.controls[controlName];
        const matchingControl = formGroup.controls[matchingControlName];

        if (matchingControl.errors && !matchingControl.errors.mustMatch) return;

        // set error on matchingControl if validation fails
        if (control.value !== matchingControl.value) {
          matchingControl.setErrors({ mustMatch: true });
        } else {
          matchingControl.setErrors(null);
        }
    }
}

  displayProfileOnClick(newDisplayProfileIdentity: DisplayProfileIdentityEnum): void {
    // If the checkbox was already checked, clear the currentlyChecked variable
    if(this.displayProfileIdentityChecked === newDisplayProfileIdentity) {
      this.displayProfileIdentityChecked = this.displayProfileIdentityEnum.none;
      return;
    }

    this.displayProfileIdentityChecked = newDisplayProfileIdentity;
  }

  private async onChangeEmail(newEmailValue: string): Promise<void> {
    this.errorMessage = '';
    this.userForm.controls['email'].setErrors(null);
    if (newEmailValue.trim().length == 0) return;

    const returnValue = await this.authenticationDataStoreService.checkEmailUnicity(newEmailValue);
    if (returnValue) {
      this.errorMessage = this.translocoService.translateObject("error.error_email");
      this.userForm.controls['email'].setErrors({ error: true });
    };
  }

  onChangeQuestion() {
    const firstSecquestion = <SecurityQuestionModel>(
      this.formControls.secretQuestion.value
    );
    this.securityQuestionsTwo = filter(this.securityQuestions, (secQues) => {
      return secQues.id != firstSecquestion.id;
    });

    this.userForm.controls['secretQuestionTwo'].enable();
    this.userForm.controls['secretAnswerTwo'].enable();
  }

  async onSubmitForm() {
    this.submitInProgress = true
    const formValue = this.userForm.value;
    const newUser = new RegisterModel(
      formValue['firstName'],
      formValue['lastName'],
      formValue['nickname'],
      formValue['email'],
      formValue['password'],
      this.displayProfileIdentityChecked,
      [
        {
          id: formValue['secretQuestion'].id,
          answer: formValue['secretAnswer'],
        },
        {
          id: formValue['secretQuestionTwo'].id,
          answer: formValue['secretAnswerTwo'],
        },
      ],
      UserRoleEnum.user,
      AuthenticationTypeEnum.Site,
      this.appShellService.getActiveLanguage()!,
    );

    const newUserResult = await this.authenticationDataStoreService.signup(
      newUser,
    );
    if (newUserResult) {
      this.profileInfoService.authenticateCurrentUser(
        newUserResult.userId,
        newUserResult.firstname,
        newUserResult.lastname,
        newUserResult.nickname,
        newUserResult.displayName,
        newUserResult.role,
        newUserResult.loginType,
        newUserResult.language,
      );
      this.registerState = FormStateEnum.Done;
    }
    ;
    this.submitInProgress = false
  }

  private setApiErrorMessage(error: ApiResultResponseEnum): string {
    if (error != ApiResultResponseEnum.NoError) {
      switch (error) {
        case ApiResultResponseEnum.InvalidBodyData:
          return this.translocoService.translate('error.required_field');
        case ApiResultResponseEnum.DataNotFound:
        case ApiResultResponseEnum.RegisterFailed:
        case ApiResultResponseEnum.CreateTokenFailed:
        case ApiResultResponseEnum.CreateRegisterTokenFailed:
          return this.translocoService.translate('error.api');
        default:
          return this.translocoService.translate('error.api');
      }
    }

    return '';
  }

  // async signUpWithGoogle(socialAuth:  SocialUser) {
  //   try {
  //     await this.coreDataStoreService.loggedSocialMedia(AuthenticationTypeEnum.Google, socialAuth, this.appShellService.getActiveLanguage()!);
  //     this.closeModal();
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }

  closeModal() {
    this.authenticationDataStoreService.resetDataStore();
    this.subscription.unsubscribe();

    this.modalDatastoreService.close(ModalNameEnum.Register);
  }
}

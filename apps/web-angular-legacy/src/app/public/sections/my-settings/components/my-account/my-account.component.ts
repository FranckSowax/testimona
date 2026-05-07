import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { ConfigurationDatastoreService } from 'src/app/shared/datastores/configuration.datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { AuthenticationTypeEnum } from 'src/app/shared/enums/auth-type.enum';
import { SecurityQuestionModel } from 'src/app/shared/models/security-question.model';
import { AccountSecurityQuestionSaveModel, AccountUserModel, AccountUserSaveModel } from '../../models/my-settings.model';
import { MySettingsDatastoreService } from '../../services/my-settings-datastore.service';

@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'mysettings' }
    },
  ],
})

export class MyAccountComponent implements OnInit {
  private _subscriptions = new Subscription();
  public errorListMySettings: string;
  public loadingDone: boolean;
  public userInfo: AccountUserModel;
  public myAccountForm: UntypedFormGroup = new UntypedFormGroup({});
  public errorMessage: string = "";
  public resultUserInfoUpdate: string = '';

  public mySecuQuestionsForm: UntypedFormGroup = new UntypedFormGroup({});
  public resultSecuQuestionInfoUpdate: string = '';

  public authenticationTypeEnum = AuthenticationTypeEnum;
  public securityQuestions = new Array<SecurityQuestionModel>();

  constructor(
    private mySettingsDatastoreService: MySettingsDatastoreService,
    private router: Router,
    private translocoService: TranslocoService,
    private formBuilder: UntypedFormBuilder,
    private configurationDatastoreService: ConfigurationDatastoreService
  ) { }

  get formControls() {
    return this.myAccountForm.controls;
  }

  async ngOnInit(): Promise<void> {

    this._subscriptions.add(
      this.mySettingsDatastoreService.ErrorMySettingsDatastore$.subscribe((errorResult) => {
        this.errorListMySettings = '';
        if (errorResult != ApiResultResponseEnum.NoError) {
          switch (errorResult) {
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.DataNotFound:
              this.router.navigate(["404"]);
              break;
            default:
              this.errorListMySettings = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );

    await this.getUserInfos()

  }

  async getUserInfos() {
    await this.mySettingsDatastoreService.getUserInfo().subscribe((userInfo) => {
      this.userInfo = userInfo;
      this.initForm(this.userInfo);
      this.loadingDone = true;
    });

  };

  async initForm(userInfo: AccountUserModel) {
    this.myAccountForm = this.formBuilder.group({
      email: ['', Validators.required],
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      nickname: ['', Validators.required],
    });

    this.myAccountForm.controls['email'].setValue(userInfo.email);
    this.myAccountForm.controls['firstname'].setValue(userInfo.firstname);
    this.myAccountForm.controls['lastname'].setValue(userInfo.lastname);
    this.myAccountForm.controls['nickname'].setValue(userInfo.nickname);

    this.mySecuQuestionsForm = this.formBuilder.group({
      firstSecuQuestion: ['', Validators.required],
      firstAnswer: ['', Validators.required],
      secondSecuQuestion: ['', Validators.required],
      secondAnswer: ['', Validators.required]
    });

    this.securityQuestions = await this.configurationDatastoreService.getSecurityQuestions();

    this.mySecuQuestionsForm.controls['firstSecuQuestion'].setValue(userInfo.questionsData[0].id);
    this.mySecuQuestionsForm.controls['secondSecuQuestion'].setValue(userInfo.questionsData[1].id);
    this.mySecuQuestionsForm.controls['firstAnswer'].setValue("****************");
    this.mySecuQuestionsForm.controls['secondAnswer'].setValue("****************");
  }

  async onSubmit() {
    const formValue = this.myAccountForm.value;
    const editedData = new AccountUserSaveModel(
      formValue['firstname'],
      formValue['lastname'],
      formValue['nickname'],
      this.translocoService.getActiveLang()
    );

    const result = await this.mySettingsDatastoreService.saveUserInfo(editedData);
    this.resultUserInfoUpdate = result ? this.translocoService.translate('mysettings.myaccount.update.user_info_success') : this.translocoService.translate('mysettings.myaccount.update.user_info_failed');
    setTimeout(() => {
      this.resultUserInfoUpdate = '';
    }, 3000);
  }

  async onSecurityQuestionSubmit() {
    const formValue = this.mySecuQuestionsForm.value;
    let editedData: AccountSecurityQuestionSaveModel[];

    if(formValue['firstSecuQuestion'] !== this.userInfo.questionsData[0].id && formValue['secondSecuQuestion'] !== this.userInfo.questionsData[1].id) {
      editedData = new Array<AccountSecurityQuestionSaveModel>(
        new AccountSecurityQuestionSaveModel(this.userInfo.questionsData[0].id, formValue['firstSecuQuestion'], formValue['firstAnswer']),
        new AccountSecurityQuestionSaveModel(this.userInfo.questionsData[1].id, formValue['secondSecuQuestion'], formValue['secondAnswer'])
      );
    } else if (formValue['firstSecuQuestion'] !== this.userInfo.questionsData[0].id && formValue['secondSecuQuestion'] === this.userInfo.questionsData[1].id) {
      editedData = new Array<AccountSecurityQuestionSaveModel>(
        new AccountSecurityQuestionSaveModel(this.userInfo.questionsData[0].id, formValue['firstSecuQuestion'], formValue['firstAnswer']),
      );
    } else if (formValue['firstSecuQuestion'] === this.userInfo.questionsData[0].id && formValue['secondSecuQuestion'] !== this.userInfo.questionsData[1].id) {
      editedData = new Array<AccountSecurityQuestionSaveModel>(
        new AccountSecurityQuestionSaveModel(this.userInfo.questionsData[1].id, formValue['secondSecuQuestion'], formValue['secondAnswer']),
      );
    }
    if (editedData.length > 0) {
      await this.SecurityQuestionSubmit(editedData)
    }
  }

  async SecurityQuestionSubmit(editedData: AccountSecurityQuestionSaveModel[]) {
    const result = await this.mySettingsDatastoreService.saveSecurityQuestionInfo(editedData);
    this.resultSecuQuestionInfoUpdate = result ? this.translocoService.translate('mysettings.myaccount.update.user_info_success') : this.translocoService.translate('mysettings.myaccount.update.user_info_failed');
    setTimeout(() => {
      this.resultSecuQuestionInfoUpdate = '';
    }, 3000);
  }
}

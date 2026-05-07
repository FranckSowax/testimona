import { NgModule } from '@angular/core';
import { AppShellComponent } from './app-shell.component';
import { CoreRoutingModule } from './routes/core-routing.module';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { StorageService } from '../shared/services/storage.service';
import { Constantes } from '../shared/constantes/constante';
import { LanguageEnum } from '../shared/enums/language.enum';
import { AppShellService } from './services/app-shell.service';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { SharedModule } from '../shared/shared.module';
import { SigninComponent } from './components/authentication/signin/signin.component';
import { RegisterComponent } from './components/authentication/register/register.component';
import { MatIconModule } from '@angular/material/icon';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { PublicMenuComponent } from './components/menus/public/public.component';
import { AdminMenuComponent } from './components/menus/admin/admin.component';

@NgModule({
    declarations: [
        AppShellComponent,
        HeaderComponent,
        FooterComponent,
        SigninComponent,
        RegisterComponent,
        NotFoundComponent,
        PublicMenuComponent,
        AdminMenuComponent,
    ],
    imports: [
        SharedModule,
        CoreRoutingModule,
        MatIconModule,
    ],
    exports: [AppShellComponent],
    providers: [{ provide: TRANSLOCO_SCOPE, useValue: { scope: 'core' } }]
})
export class CoreModule {
  constructor(
    private storageService: StorageService,
    private appShellService: AppShellService,
  ) {
    this.defineSiteLanguage();
  }

  private defineSiteLanguage() {
    let lang = this.storageService.getLocalStorage(
      Constantes.languageStorage,
    );
    if (!lang || lang == '') {
      lang = navigator.language.toLowerCase();
    }

    if (
      !Object.values(LanguageEnum).find((ite) => ite == lang)
    ) {
      // English is the default language
      lang = LanguageEnum.English.toString();
    }

    this.storageService.addLocalStorage(
      Constantes.languageStorage,
      lang
    );
    this.appShellService.setActiveLanguage(lang);
  }
}

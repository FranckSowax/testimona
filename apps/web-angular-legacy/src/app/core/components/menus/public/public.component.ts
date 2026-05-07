import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { TranslocoService } from '@ngneat/transloco';
import { InformationPageEnum } from 'src/app/shared/enums/information-page.enum';
import { environment } from 'src/environments/environment';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-public-menu',
  templateUrl: './public.component.html',
  styleUrls: ['./public.component.scss'],
})
export class PublicMenuComponent implements OnInit {
  public assetUrl = environment.assetUrl;
  public year: number = new Date().getFullYear();

  public informationPage = InformationPageEnum;
  public currentLanguage: string;

  constructor(
    private router: Router,
    private appShellService: AppShellService,
    private translocoService: TranslocoService,
    private clipboard: Clipboard,
    private _snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    setTimeout(() => {
      this.currentLanguage = this.translocoService.translate(`core.language.items.${this.appShellService.getActiveLanguage().toLowerCase()}.long`);
    }, 500);
  }

  gotToInformationPage(informationPage: InformationPageEnum) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree([`/${informationPage}`])
    );

    window.open(url, '_blank');
  }

  shareMemorial() {
    this.clipboard.copy(location.href);
    this._snackBar.open(this.translocoService.translate('core.copied'), '', {
      duration: 3000
    });
  }

  setLanguage(lang: string): void {
    this.appShellService.setActiveLanguage(lang);
    setTimeout(() => {
      this.currentLanguage = this.translocoService.translate(`core.language.items.${this.appShellService.getActiveLanguage().toLowerCase()}.long`);
    }, 500);
  }
}

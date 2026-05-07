import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@ngneat/transloco';
import { filter } from 'rxjs/operators';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { InformationPageEnum } from 'src/app/shared/enums/information-page.enum';
import { ModalNameEnum } from 'src/app/shared/enums/modal.enum';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent implements OnInit {
  public assetUrl = environment.assetUrl;
  public year: number = new Date().getFullYear();
  public isLoggedIn: boolean = false;
  public informationPage = InformationPageEnum;
  public currentLanguage: string;

  constructor(
    private appShellService: AppShellService,
    private profileInfoService: ProfileInfosService,
    private modalDatastoreService: ModalDatastoreService,
    private router: Router,
    private translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.profileInfoService
      .IsLoggedIn$()
      .subscribe((isLogged) => (this.isLoggedIn = isLogged));

    this.translocoService.events$.pipe(filter(e => e.type === 'translationLoadSuccess' && e.payload.scope === 'core')).subscribe((dqtq) => {
      this.currentLanguage = this.translocoService.translate(`core.language.items.${this.appShellService.getActiveLanguage().toLowerCase()}.long`);
    });
  }

  signup(): void {
    this.modalDatastoreService.open(ModalNameEnum.Register);
  }

  gotToInformationPage(informationPage: InformationPageEnum) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree([`/${informationPage}`])
    );
  
    window.open(url, '_blank');
  }

  setLanguage(lang: string): void {
    this.appShellService.setActiveLanguage(lang);
  }
}

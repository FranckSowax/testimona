import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { environment } from 'src/environments/environment';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { AuthenticationDataStoreService } from '../../datastores/authentication.datastore.service';
import { Router, Event, NavigationEnd } from '@angular/router';
import { SearchParentSourceEnum } from 'src/app/shared/enums/search-parent-source.enum';
import { AppShellService } from '../../services/app-shell.service';
import { SelectedMemorialSearchModel } from 'src/app/shared/models/search-result.model';
import { DisplayMenuModel, MenuTypeEnum } from '../../models/display-menu.model';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  public isLoggedIn: boolean = false;
  public isAdmin: boolean = false;
  public displayAdminLink: boolean = false;
  public assetUrl = environment.assetUrl;
  public displaySignin = false;
  public displayMenu = false;
  public signinModalViewModel: ModalViewModel;

  public searchParentSourceEnum = SearchParentSourceEnum;

  private _subscription = new Subscription();

  constructor(
    private authenticationDataStoreService: AuthenticationDataStoreService,
    private appShellService: AppShellService,
    private profileInfoService: ProfileInfosService,
    private modalDatastoreService: ModalDatastoreService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this._subscription.add(
      this.profileInfoService
        .IsLoggedIn$()
        .subscribe((isLogged) => {
          this.isLoggedIn = isLogged;
          this.isAdmin = this.profileInfoService.userIsAdmin();

        })
    );

    this._subscription.add(
      this.router.events.pipe(filter((event: Event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.displayAdminLink = !event.url.toLowerCase().includes('/admin');
      })
    );

    this.appShellService.DisplayMenu$.pipe(distinctUntilChanged()).subscribe((displayMenu: DisplayMenuModel) => {
      if (displayMenu) {
        this.displayAdminLink = (displayMenu.type == MenuTypeEnum.Admin && displayMenu.newValue);
        this.displayMenu = displayMenu.type == MenuTypeEnum.Admin || displayMenu.type == MenuTypeEnum.Public;
      }
    });

    this.signinModalViewModel = new ModalViewModel(ModalNameEnum.Signin, ModalStateEnum.Closed);

    this._subscription.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;

        if (modal.id == ModalNameEnum.Signin) {
          this.displaySignin = modal.state == ModalStateEnum.Opened;
        }
      })
    );
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  async signout() {
    const returnValue = await this.authenticationDataStoreService.signout(this.profileInfoService.getCurrentUserLoginType());
    if (!returnValue) throw '';

    this.profileInfoService.signoutCurrentUser();
    this.router.navigate(["/"]);
  }

  register() {
    this.modalDatastoreService.open(ModalNameEnum.Register);
  }

  signin() {
    this.modalDatastoreService.open(this.signinModalViewModel?.id!, this.router.url == '/' ? ModalStateEnum.ClosedAndRedirect : undefined);
  }

  displayMemorial(memorialItem: SelectedMemorialSearchModel) {
    this.router.navigate(['memorial', memorialItem.memorialUrl]);
  }

   // ajouter un margin-left: -20px pour l'image quand le footer est à gauche
}

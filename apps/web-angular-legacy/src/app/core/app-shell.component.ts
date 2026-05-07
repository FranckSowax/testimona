import { Component, OnInit } from '@angular/core';
import { distinctUntilChanged } from 'rxjs/operators';
import { ModalDatastoreService } from '../shared/datastores/modal.datastore.service';
import { ModalNameEnum, ModalStateEnum } from '../shared/enums/modal.enum';
import { ModalViewModel } from '../shared/models/modal-view.model';
import { DisplayMenuModel, MenuTypeEnum } from './models/display-menu.model';
import { AppShellService } from './services/app-shell.service';

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss']
})
export class AppShellComponent implements OnInit {

  public homeStyle: boolean;
  public informationStyle: boolean;
  public footerToTheLeftStyle: boolean;

  public displayFooter: boolean;

  public displayMenu: boolean;
  public displayAdminMenu: boolean;
  public displayPublicMenu: boolean;

  public displayRegister = false;
  public registerModalViewModel: ModalViewModel;

  constructor(private modalDatastoreService: ModalDatastoreService, private appShellService: AppShellService) { }

  ngOnInit(): void {
    this.appShellService.DesignToApply$.subscribe((designToApply) => {
      this.setCorrectDesign(
        designToApply == this.appShellService.DesignToApplyEnum.Home,
        designToApply == this.appShellService.DesignToApplyEnum.Informations,
      );
    });

    this.appShellService.DisplayFooter$.subscribe((displayFooter) => {
      this.displayFooter = displayFooter;
    });

    this.appShellService.DisplayMenu$.pipe(distinctUntilChanged()).subscribe((displayMenu: DisplayMenuModel) => {
      if (displayMenu) {
        this.displayAdminMenu = (displayMenu.type == MenuTypeEnum.Admin && displayMenu.newValue);
        this.displayPublicMenu = (displayMenu.type == MenuTypeEnum.Public && displayMenu.newValue);

        this.displayMenu = this.displayAdminMenu || this.displayPublicMenu;
      }
    });

    this.registerModalViewModel = new ModalViewModel(ModalNameEnum.Register, ModalStateEnum.Closed);

    this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
      if (modal?.id == ModalNameEnum.Register) {
        this.displayRegister = modal.state == ModalStateEnum.Opened;
      }
    });
  }

  private setCorrectDesign(home: boolean, information: boolean): void {
    this.homeStyle = home;
    this.informationStyle = information;
  }
}

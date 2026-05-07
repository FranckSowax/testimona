import { Component, OnInit, Input, ViewEncapsulation, OnDestroy, ViewChild } from '@angular/core';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { Subscription } from 'rxjs';
import { MenuMemorialService } from 'src/app/shared/services/menu-memorial.service';
import { MenuMemorialEnum } from 'src/app/shared/enums/menu-memorial.enum';
import { MatLegacyTab as MatTab, MatLegacyTabGroup as MatTabGroup } from '@angular/material/legacy-tabs';

@Component({
  selector: 'app-menu-memorial',
  templateUrl: './menu-memorial.component.html',
  styleUrls: ['./menu-memorial.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'memorial' }
    }
  ],
  encapsulation: ViewEncapsulation.None
})
export class MenuMemorialComponent implements OnInit, OnDestroy {
  @Input('memorialId') memorialId: number;
  @Input('memorialUrl') memorialUrl: string;
  @Input('memorialUserRelathionship') memorialUserRelathionship: string;

  @ViewChild('matTabControl', { static: true }) tabGroup: MatTabGroup;

  public displayBiography: boolean = false;
  public displayDonation: boolean = false;
  public displayFuneral: boolean = false;
  public displayPhoto: boolean = false;

  private _subscription = new Subscription();

  constructor(
    private menuMemorialService: MenuMemorialService
  ) { }

  ngOnInit(): void {
    this._subscription.add(
      this.menuMemorialService.SelectedTab$.subscribe((newSelectedTab: MenuMemorialEnum) => this.newSelectedTab(newSelectedTab))
    );
  }

  ngOnDestroy(): void {
      this._subscription.unsubscribe();
  }

  selectedTabChanged(event: any) {
    if (event.index == 4) {
      this.displayFuneral = true;
    } else if (event.index == 3) {
      this.displayBiography = true;
    } else if (event.index == 2) {
        this.displayDonation = true;
    } else if (event.index == 1) {
      this.displayPhoto = true;
    }
  }

  private newSelectedTab(newSelectedTab : MenuMemorialEnum): void {
    switch(newSelectedTab) {
      case MenuMemorialEnum.Testimonial:
        this.tabGroup.selectedIndex = 0;
        break;
    }
  }
}

import { NgModule } from '@angular/core';
import { ActivationStart, Router, RouterModule, Routes, Event } from '@angular/router';
import { AdminGuard } from 'src/app/core/guards/admin.guard';
import { MenuTypeEnum } from 'src/app/core/models/display-menu.model';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { AdminComponent } from '../admin.component';
import { AdminMemorialListComponent } from '../sections/memorials/components/list/list.component';
import { AdminDonationListComponent } from '../sections/donations/components/list/list.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    canActivate: [AdminGuard],
    children: [
      {
        path: 'memorials',
        component: AdminMemorialListComponent
      },
      {
        path: 'donations/:memorialId',
        component: AdminDonationListComponent
      }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {
  constructor(private router: Router, private appShellService: AppShellService) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof ActivationStart) {
        if (event.snapshot.routeConfig.component == AdminComponent) {
            this.appShellService.displayFooter(false);
            this.appShellService.displayMenu(MenuTypeEnum.Admin, true);
          }
      }
    });
  }
}

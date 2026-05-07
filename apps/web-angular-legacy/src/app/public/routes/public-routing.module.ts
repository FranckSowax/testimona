import { NgModule } from '@angular/core';
import { PublicComponent } from '../public.component';
import { ActivationStart, Router, RouterModule, Routes, Event, ActivationEnd } from '@angular/router';
import { HomeComponent } from '../sections/home/components/home/home.component';
import { MemorialDisplayComponent } from '../sections/memorial/components/display-memorial/display-memorial.component';
import { AuthGuard } from 'src/app/core/guards/auth.guard';
import { InformationComponent } from '../sections/information/information.component';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { PublicGuard } from 'src/app/core/guards/public.guard';
import { DisplayMyMemorialsComponent } from '../sections/my-memorials/components/display-my-memorials/display-my-memorials.component';
import { DisplayMyTestimonialsComponent } from '../sections/my-testimonials/components/display-my-testimonials/display-my-testimonials.component';
import { MenuTypeEnum } from 'src/app/core/models/display-menu.model';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { MyAccountComponent } from '../sections/my-settings/components/my-account/my-account.component';

const routes: Routes = [
  {
    path: '',
    component: PublicComponent,
    children: [
      {
        path: '',
        component: HomeComponent,
        canActivate: [PublicGuard]
      },
      // Begin Information pages
      {
        path: 'about-us',
        component: InformationComponent
      },
      {
        path: 'faq',
        component: InformationComponent
      },
      {
        path: 'cookies',
        component: InformationComponent
      },
      // End Information pages
      {
        path: 'memorial/:url',
        component: MemorialDisplayComponent,
        canActivate: [PublicGuard]
      },
      {
        path: 'mymemorials',
        component: DisplayMyMemorialsComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'mytestimonials',
        component: DisplayMyTestimonialsComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'myaccount',
        component: MyAccountComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'memorial/:url/success/:donationId',
        component: MemorialDisplayComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'memorial/:url/failed/:donationId',
        component: MemorialDisplayComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'activate/:userId',
        component: HomeComponent,
        canActivate: [PublicGuard]
      }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PublicRoutingModule {
  constructor(private router: Router, private appShellService: AppShellService, private profileInfosService: ProfileInfosService) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof ActivationStart) {
        switch(event.snapshot.routeConfig.component) {
          case HomeComponent:
            this.appShellService.setDesignToApply(this.appShellService.DesignToApplyEnum.Home);
            this.appShellService.displayFooter(true);
            this.appShellService.displayMenu(MenuTypeEnum.All, false);
            break;
          case InformationComponent:
            this.appShellService.setDesignToApply(this.appShellService.DesignToApplyEnum.Informations);
            this.appShellService.displayFooter(true);
            this.appShellService.displayMenu(MenuTypeEnum.All, false);
            break;
          case MemorialDisplayComponent:
            this.appShellService.displayFooter(false);
            this.appShellService.displayMenu(MenuTypeEnum.Public, true);
            break;
          case DisplayMyMemorialsComponent:
          case DisplayMyTestimonialsComponent:
          case MyAccountComponent:
            this.appShellService.displayFooter(false);
            this.appShellService.displayMenu(MenuTypeEnum.Public, true);
            break;
        }
      } else if (event instanceof ActivationEnd) {
        if (event.snapshot.routeConfig.component == HomeComponent) {
          if (this.profileInfosService.IsLoggedIn$().getValue()) {
            // this.router.navigate(['mymemorials']);
          }
        }
      }
    });
  }
}

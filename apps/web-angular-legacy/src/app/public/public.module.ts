import { NgModule } from '@angular/core';
import { PublicComponent } from './public.component';
import { PublicRoutingModule } from './routes/public-routing.module';
import { HomeComponent } from './sections/home/components/home/home.component';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { TestimonaCreateComponent } from './sections/testimona/components/create-testimona/create-testimona.component';
import { MemorialCreateComponent } from './sections/memorial/components/create-memorial/create-memorial.component';
import { MemorialDisplayComponent } from './sections/memorial/components/display-memorial/display-memorial.component';
import { InformationComponent } from './sections/information/information.component';
import { AboutUsComponent } from './sections/information/components/about-us/about-us.component';
import { CookiesComponent } from './sections/information/components/cookies/cookies.component';
import { FaqComponent } from './sections/information/components/faq/faq.component';
import { SharedModule } from '../shared/shared.module';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MemorialEditComponent } from './sections/memorial/components/edit-memorial/edit-memorial.component';
import { MemorialAdminComponent } from './sections/memorial/components/admin-memorial/admin-memorial.component';
import { TestimonaListComponent } from './sections/testimona/components/list-testimona/list-testimona.component';
import { TestimonaListItemComponent } from './sections/testimona/components/list-item-testimona/list-item-testimona.component';
import { MenuMemorialComponent } from './sections/memorial/components/menu-memorial/menu-memorial.component';
import { DisplayFuneralComponent } from './sections/funeral/components/display-funeral/display-funeral.component';
import { CreateFuneralComponent } from './sections/funeral/components/create-funeral/create-funeral.component';
import { EditFuneralComponent } from './sections/funeral/components/edit-funeral/edit-funeral.component';
import { DisplayFuneralEventComponent } from './sections/funeral/components/display-funeral-event/display-funeral-event.component';
import { CreateFuneralEventComponent } from './sections/funeral/components/create-funeral-event/create-funeral-event.component';
import { EditFuneralEventComponent } from './sections/funeral/components/edit-funeral-event/edit-funeral-event.component';
import { CreateBiographyComponent } from './sections/biography/components/create-biography/create-biography.component';
import { DisplayBiographyComponent } from './sections/biography/components/display-biography/display-biography.component';
import { EditBiographyComponent } from './sections/biography/components/edit-biography/edit-biography.component';
import { CreateChapterComponent } from './sections/biography/components/create-chapter/create-chapter.component';
import { DisplayChapterComponent } from './sections/biography/components/display-chapter/display-chapter.component';
import { EditChapterComponent } from './sections/biography/components/edit-chapter/edit-chapter.component';
import { EditTestimonaComponent } from './sections/testimona/components/edit-testimona/edit-testimona.component';
import { DisplayMyMemorialsComponent } from './sections/my-memorials/components/display-my-memorials/display-my-memorials.component'
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { DisplayPhotoComponent } from './sections/photo/components/display-photo/display-photo.component';
import { AddPhotoComponent } from './sections/photo/components/add-photo/add-photo.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { HomeTestimonaCreateComponent } from './sections/home/components/create-testimona/create-testimona.component';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { DisplayMyTestimonialsComponent } from './sections/my-testimonials/components/display-my-testimonials/display-my-testimonials.component';
import { MyAccountComponent } from './sections/my-settings/components/my-account/my-account.component';
import { DisplayDonationComponent } from './sections/donation/components/display-donation/display-donation.component';
import { AddDonationComponent } from './sections/donation/components/add-donation/add-donation.component';
import { UpdateGoalDonationComponent } from './sections/donation/components/update-goal-donation/update-goal-donation.component';
import { DonationSuccessComponent } from './sections/memorial/components/donation-success/donation-success.component';
import { DonationFailedComponent } from './sections/memorial/components/donation-failed/donation-failed.component';
import { ActivateUserComponent } from './sections/home/components/activate-user/activate-user.component';
import {MatProgressBarModule} from '@angular/material/progress-bar';

@NgModule({
  declarations: [
    PublicComponent,
    HomeComponent,
    HomeTestimonaCreateComponent,
    // Information Components
    InformationComponent,
    AboutUsComponent,
    FaqComponent,
    CookiesComponent,
    // Memorial Components
    MemorialAdminComponent,
    MemorialEditComponent,
    MemorialCreateComponent,
    MemorialDisplayComponent,
    MenuMemorialComponent,
    // Testimonal Components
    TestimonaCreateComponent,
    TestimonaListComponent,
    TestimonaListItemComponent,
    EditTestimonaComponent,
    // Funeral Components
    DisplayFuneralComponent,
    CreateFuneralComponent,
    EditFuneralComponent,
    // Funeral Event Components
    DisplayFuneralEventComponent,
    CreateFuneralEventComponent,
    EditFuneralEventComponent,
    // Biography Components
    CreateBiographyComponent,
    DisplayBiographyComponent,
    EditBiographyComponent,
    // Chapter Components
    CreateChapterComponent,
    DisplayChapterComponent,
    EditChapterComponent,
    // Settings Components
    DisplayMyMemorialsComponent,
    DisplayMyTestimonialsComponent,
    MyAccountComponent,
    // Photo Components
    DisplayPhotoComponent,
    AddPhotoComponent,
    // Donation Components
    DisplayDonationComponent,
    UpdateGoalDonationComponent,
    AddDonationComponent,
    DonationSuccessComponent,
    DonationFailedComponent,
    ActivateUserComponent,
  ],
  imports: [
    SharedModule,
    PublicRoutingModule,
    MatTooltipModule,
    InfiniteScrollModule,
    MatIconModule,
    MatAutocompleteModule,
    MatExpansionModule,
    MatProgressBarModule
  ],
  providers: [
    { provide: TRANSLOCO_SCOPE, useValue: { scope: 'public', alias: 'site' } },
  ],
})
export class PublicModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminComponent } from './admin.component';
import { AdminRoutingModule } from './routes/admin-routing.module';
import { TranslocoModule, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { SharedModule } from '../shared/shared.module';
import { AdminMemorialListComponent } from './sections/memorials/components/list/list.component';
import { AdminDonationListComponent } from './sections/donations/components/list/list.component';


@NgModule({
  declarations: [
    AdminComponent,
    AdminMemorialListComponent,
    AdminDonationListComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    TranslocoModule,
    SharedModule,
    MatProgressSpinnerModule,
    MatPaginatorModule
  ],
  exports: [
    MatProgressSpinnerModule,
  ],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'admin' }],
})
export class AdminModule { }

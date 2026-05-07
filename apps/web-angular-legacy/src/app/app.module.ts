import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { AdminGuard } from './core/guards/admin.guard';
import { CoreInterceptor } from './core/helpers/core.interceptor';
import { TranslocoRootModule } from './transloco/transloco-root.module';
import { AuthGuard } from './core/guards/auth.guard';
import { ModalDatastoreService } from './shared/datastores/modal.datastore.service';
import { PublicGuard } from './core/guards/public.guard';
import { MatTabsModule } from '@angular/material/tabs';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    MatTabsModule,
    CoreModule,
    HttpClientModule,
    TranslocoRootModule,
    BrowserAnimationsModule,
  ],
  providers: [
    AuthGuard,
    AdminGuard,
    PublicGuard,
    ProfileInfosService,
    ModalDatastoreService,
    { provide: HTTP_INTERCEPTORS, useClass: CoreInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ModalViewComponent } from './components/modal-view/modal-view.component';
import { MemorialSearchComponent } from './components/search-memorial/search-memorial.component';
import { TranslocoModule, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { RouterModule } from '@angular/router';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { SharedUploadMediaComponent } from './components/upload-media/upload-media.component';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { SharedPhotoViewerComponent } from './components/photo-viewer/photo-viewer.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@NgModule({
  declarations: [ModalViewComponent, MemorialSearchComponent, SharedUploadMediaComponent, SharedPhotoViewerComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    RouterModule,
    MatTooltipModule,
    TranslocoModule,
    MatTabsModule,
    MatMenuModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslocoModule,
    ModalViewComponent,
    MemorialSearchComponent,
    SharedUploadMediaComponent,
    SharedPhotoViewerComponent,
    MatTabsModule,
    MatMenuModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: { scope: 'shared' } }],
})
export class SharedModule {}

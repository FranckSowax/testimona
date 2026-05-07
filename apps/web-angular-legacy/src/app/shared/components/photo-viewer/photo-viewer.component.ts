import { Component, Inject } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { environment } from 'src/environments/environment';
import { IPhotoViewer } from '../../interfaces/photo-viewer.interface';

@Component({
  selector: 'shared-photo-viewer',
  templateUrl: './photo-viewer.component.html',
  styleUrls: ['./photo-viewer.component.scss']
})
export class SharedPhotoViewerComponent {
  public assetUrl = environment.assetUrl;

  constructor(private dialogRef: MatDialogRef<SharedPhotoViewerComponent>, @Inject(MAT_DIALOG_DATA) public photoViewer: IPhotoViewer) { }

  closeViewer(): void {
    this.dialogRef.close();
  }
}

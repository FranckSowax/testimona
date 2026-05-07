import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { map } from 'lodash-es';

@Component({
  selector: 'shared-upload-media',
  templateUrl: './upload-media.component.html',
  styleUrls: ['./upload-media.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'shared' }
    },
  ],
})
export class SharedUploadMediaComponent implements OnInit {
  @Input() acceptedFiles: string;
  @Input() maximumFiles: number;
  @Input() disabled: boolean;
  @Input() previousFiles: Array<ImportFile> | null;

  @ViewChild('uploadButton', {static: true }) uploadButton: ElementRef<HTMLButtonElement>;
  @ViewChild('uploadInput', { static: true }) uploadInput: ElementRef<HTMLInputElement>;

  @Output() onChange = new EventEmitter<{ files: { toAdd: File[], toDelete: string[] } }>();

  public currentFiles: Array<ImportFile> = new Array<ImportFile>();

  private importedFiles: Array<ImportFile> = new Array<ImportFile>();

  constructor() { }

  ngOnInit(): void {
    if (this.previousFiles != null && this.previousFiles.length > 0) {
      this.currentFiles = Object.assign(Array<ImportFile>(), this.previousFiles);
      this.importedFiles = Object.assign(Array<ImportFile>(), this.previousFiles);
    }
  }

  addFiles() {
    const filesToImport = this.uploadInput.nativeElement.files;

    if (filesToImport.length > this.maximumFiles || this.importedFiles.length > this.maximumFiles) { return; }

    const newArray = map(filesToImport, (filesToImport) => { return { filename: filesToImport.name, photoUrl: '', fileData: filesToImport }; });
    this.importedFiles.push(...newArray);
    map(this.importedFiles, (file) => this.previewPhoto(file.fileData));

    if (this.importedFiles.length >= this.maximumFiles) { this.disabled = true; }
    this.uploadInput.nativeElement.value = '';

    this.onChange.emit({ files:
      {
        toAdd: this.importedFiles.filter((ite) => (ite.fileData != null && ite.fileData != undefined)).map((ite) => ite.fileData),
        toDelete: this.previousFiles?.filter((ite) => !this.importedFiles.map((pf) => pf.filename).includes(ite.filename)).map((ite) => ite.filename),
      }
    });
  }

  deleteFile(filenameToDelete: string): void {
    this.importedFiles = this.importedFiles.filter((ele) => ele.filename != filenameToDelete);
    this.currentFiles = this.currentFiles.filter((ele) => ele.filename != filenameToDelete);

    map(this.importedFiles, (file) => this.previewPhoto(file.fileData));

    this.disabled = false;

    this.onChange.emit({ files:
      {
        toAdd: this.importedFiles.filter((ite) => (ite.fileData != null && ite.fileData != undefined)).map((ite) => ite.fileData),
        toDelete: this.previousFiles?.filter((ite) => !this.importedFiles.map((pf) => pf.filename).includes(ite.filename)).map((ite) => ite.filename),
      }
    });
  }

  async previewPhoto(file: File) {
    if (file == undefined) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (!this.currentFiles.some((ite: ImportFile) => ite.filename == file.name)) {
        this.currentFiles = [...this.currentFiles, ...[{ filename: file.name, photoUrl: reader.result as string, fileData: file }]];
      }
    };
    reader.readAsDataURL(file);
  }
}

export class ImportFile {
  readonly filename: string;
  readonly photoUrl: string;
  readonly fileData: File
}

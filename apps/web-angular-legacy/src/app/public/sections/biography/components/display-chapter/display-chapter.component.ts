import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { ChapterDatastoreService } from '../../services/chapter-datastore.service';
import { environment } from 'src/environments/environment';
import { ChapterListModel } from '../../models/chapter-list.model';
import { DatePipe } from '@angular/common';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { SharedPhotoViewerComponent } from 'src/app/shared/components/photo-viewer/photo-viewer.component';
import { filter } from 'lodash-es';

@Component({
  selector: 'app-display-chapter',
  templateUrl: './display-chapter.component.html',
  styleUrls: ['./display-chapter.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'biography' }
    },
    DatePipe
  ],
})
export class DisplayChapterComponent implements OnInit, OnDestroy {
  @Input('memorialId') memorialId: number;

  createChapterModalViewModel: ModalViewModel;
  displayCreateChapter: boolean = false;
  private _subscriptions = new Subscription();
  public loadingDone: boolean = false;
  public listOfChapters: ChapterListModel[];
  public assetUrl = environment.assetUrl;
  public chapterId: number;
  editChapterModalViewModel: ModalViewModel;
  displayEditChapter: boolean = false;

  constructor(
    private profileInfosService: ProfileInfosService,
    private modalDatastoreService: ModalDatastoreService,
    private router: Router,
    private matDialog: MatDialog,
    private chapterDatastoreService: ChapterDatastoreService,
    private datepipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.createChapterModalViewModel = new ModalViewModel(ModalNameEnum.CreateChapter, ModalStateEnum.Closed);
    this.editChapterModalViewModel = new ModalViewModel(ModalNameEnum.EditChapter, ModalStateEnum.Closed);

    this._subscriptions.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;
        if (modal.id == ModalNameEnum.CreateChapter) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayCreateChapter = modal.state == ModalStateEnum.Opened;
          }
          else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.displayCreateChapter = false;
            (async () => await this.getListOfChapters())();
          }
        } else if (modal.id == ModalNameEnum.EditChapter) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayEditChapter = modal.state == ModalStateEnum.Opened;
          }
          else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.chapterId = 0;
            this.displayEditChapter = false;
            (async () => await this.getListOfChapters())();
          }
        }
      },
        (error) => {
          console.log(error);
          this.router.navigate(['/404'])
          this.loadingDone == true;
        })
    );
    (async () => await this.getListOfChapters())();
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
  }

  async getListOfChapters() {
    const listOfChapters = await this.chapterDatastoreService.getChaptersList(this.memorialId);
    if (listOfChapters) {
      this.listOfChapters = listOfChapters.sort((a,b) => a.createDate.localeCompare(b.createDate));
      this.loadingDone = true;
    }
  }

  getDate(date: string) {
    return this.datepipe.transform(new Date(date), 'MM/dd/yyyy')
  }

  createChapter() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.CreateChapter);
  }

  editChapter(chapterId: number, chapterUserId: string) {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    if (this.myChapter(chapterUserId)) {
      this.chapterId = chapterId;
      this.modalDatastoreService.open(ModalNameEnum.EditChapter);
    }
  }

  deleteChapter(chapterId: number, chapterUserId: string) {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    if (this.myChapter(chapterUserId)) {
      this.chapterId = chapterId;
      const result = this.chapterDatastoreService.deleteChapter(chapterId)
      if (result) {
        this.listOfChapters = filter(this.listOfChapters, (item: ChapterListModel) => item.id != chapterId);
      }
    }
  }

  openFullsize(photoUrl: string): void {
    this.matDialog.open(SharedPhotoViewerComponent, {
      panelClass: 'photo-viewer-dialog',
      data: {
        photoUrl: photoUrl
      }
    });
  }

  myChapter(chapterUserId: string): boolean {
    return this.profileInfosService.getCurrentUserInfos().userId == chapterUserId;
  }
}

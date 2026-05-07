import { Component, OnInit } from '@angular/core';
import { Translation, TranslocoService } from '@ngneat/transloco';
import { AdminMemorialDatastoreService } from '../../services/admin-memorial-datastore.service';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { AdminMemorialModel } from '../../models/admin-memorial.model';
import { environment } from 'src/environments/environment';
import { DateHelpers } from 'src/app/shared/helpers/date.helper';
import { DatePipe } from '@angular/common';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';

@Component({
  selector: 'app-admin-memorial-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  providers: [ DatePipe ]
})

export class AdminMemorialListComponent implements OnInit {
  public loadingDone: boolean = false;
  public assetUrl = environment.assetUrl;

  public listOfAdminMemorials: AdminMemorialModel[];

  public pageSizeOptions: number[] = [10, 20, 30];
  public length: number = 100;
  public pageSize: number = 10;
  public pageIndex: number = 0;

  public createdDateToDisplay: string;
  public modifiedDateToDisplay: string;
  public countryOfDeathMemorial: string;
  public countryOfDeathCode: number;

  private countriesData: Translation;

  constructor(
    private adminMemorialDatastoreService: AdminMemorialDatastoreService,
    private translocoService: TranslocoService,
    private appShellService: AppShellService,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.translocoService.load(`countries/${this.appShellService.getActiveLanguage()}`).subscribe((countriesData: Translation) => {
      this.countriesData = countriesData;

      this.getData(this.pageIndex, this.pageSize);
    });
  }

  private async getData(pageIndex: number, pageSize: number): Promise<void> {
    this.loadingDone = false;

    const adminMemorialsResult = await this.adminMemorialDatastoreService.getAdminMemorialsList(pageIndex, pageSize);
    if (adminMemorialsResult) {
      this.length = adminMemorialsResult.total;

      if (adminMemorialsResult.total > 0){
        adminMemorialsResult.memorialItems.forEach((adminMemorial) => {
          adminMemorial.countryOfDeathName = this.countriesData[adminMemorial.countryOfDeath.code];
          this.countryOfDeathCode = adminMemorial.countryOfDeath.id;
          adminMemorial.dateOfDeathName = this.getMemorialDateOfDeath(adminMemorial);
          adminMemorial.createdDate = this.datePipe.transform(adminMemorial.createdDate, 'dd/MM/yyyy');
          adminMemorial.modifiedDate = this.datePipe.transform(adminMemorial.modifiedDate, 'dd/MM/yyyy');
        })
        this.listOfAdminMemorials = adminMemorialsResult.memorialItems;
      }
    }

    this.loadingDone = true;
  }

  refreshData(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;

    this.getData(this.pageIndex, this.pageSize);
  }

  private getMemorialDateOfDeath(memorial: AdminMemorialModel): string {
    let stringToReturn = ""
    if (memorial.monthOfDeath > 0) {
      if (memorial.dayOfDeath > 0) {
        stringToReturn = DateHelpers.addZero(memorial.dayOfDeath);
      }
      stringToReturn += "/" + DateHelpers.addZero(memorial.monthOfDeath);

    }
    stringToReturn += "/" + memorial.yearOfDeath.toString();

    return stringToReturn;
  }
}

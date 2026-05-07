import { Component, OnInit } from '@angular/core';
import { AdminDonationDatastoreService } from '../../services/admin-donation-datastore.service';
import { environment } from 'src/environments/environment';
import { AdminDonationItemModel } from '../../models/admin-donation.model';
import { ActivatedRoute } from '@angular/router';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { from } from 'rxjs';

@Component({
  selector: 'app-admin-donation-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class AdminDonationListComponent implements OnInit {
  public loadingDone: boolean = false;
  public assetUrl = environment.assetUrl;

  public listOfAdminDonations: AdminDonationItemModel[];
  public goalDonations: number;
  public amountTotal: number;
  public pageSizeOptions: number[] = [10, 20, 30];
  public length: number = 100;
  public pageSize: number = 10;
  public pageIndex: number = 0;
  public memorialId: number = 0;

  constructor(
    private adminDonationDatastoreService: AdminDonationDatastoreService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    from(this.getData(this.pageIndex, this.pageSize)).subscribe();
  }

  private async getData(pageIndex: number, pageSize: number): Promise<void> {
    this.loadingDone = false;
    this.route.paramMap.subscribe((obs) => {
      this.memorialId = parseInt(obs.get('memorialId'));
    });
    const adminDonationsResult = await this.adminDonationDatastoreService.getAdminDonationsList(this.memorialId, pageIndex, pageSize);
    const goalDonationsResult = await this.adminDonationDatastoreService.getAdminDonationGoal(this.memorialId);

    this.listOfAdminDonations = adminDonationsResult.donations;
    this.goalDonations = goalDonationsResult.donationGoal;
    this.amountTotal = goalDonationsResult.totalAmountDonation;
    this.length = adminDonationsResult.numberOfDonation;
    this.loadingDone = true;
   }

   refreshData(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;

    from(this.getData(this.pageIndex, this.pageSize)).subscribe();
  }
}

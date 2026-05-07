import { Component, Input, OnInit } from '@angular/core';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { from, Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';
import { environment } from 'src/environments/environment';
import { DonationItemModel } from '../../models/donation.model';
import { DonationDatastoreService } from '../../services/donation-datastore.service';
import { MemorialCurrentUserModel } from '../../../memorial/models/memorial.model';
import { MemorialDatastoreService } from '../../../memorial/services/memorial-datastore.service';

@Component({
  selector: 'app-display-donation',
  templateUrl: './display-donation.component.html',
  styleUrls: ['./display-donation.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'donation' }
    }
  ],
})
export class DisplayDonationComponent implements OnInit {
  @Input('memorialId') memorialId: number;
  @Input('memorialUrl') memorialUrl: string;
  public assetUrl = environment.assetUrl;
  public addDonationModalViewModel: ModalViewModel;
  public updateGoalDonationModalViewModel: ModalViewModel;
  public displayAddDonation: boolean = false;
  public displayUpdateGoalDonation: boolean = false;
  public amountTotal: number = 0;
  public donationGoal: number;
  public messageDonation: string;
  public listDonations: DonationItemModel[];
  public loadingDone: boolean = false;

  private _subscriptions = new Subscription();
  public currentRelationship: MemorialCurrentUserModel | null;


  constructor(
    private modalDatastoreService: ModalDatastoreService,
    private profileInfosService: ProfileInfosService,
    private donationDatastoreService: DonationDatastoreService,
    private memorialDatastoreService: MemorialDatastoreService,
  ) { }

  ngOnInit(): void {
    this.currentRelationship = null;
    this.loadingDone = false;
    this.addDonationModalViewModel = new ModalViewModel(ModalNameEnum.AddDonation, ModalStateEnum.Closed);
    this.updateGoalDonationModalViewModel = new ModalViewModel(ModalNameEnum.UpdateGoalDonation, ModalStateEnum.Closed);
    this._subscriptions.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;
        if (modal.id == ModalNameEnum.AddDonation) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayAddDonation = modal.state == ModalStateEnum.Opened;
          } else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.getDonationInfos();
          }
        }
        if (modal.id == ModalNameEnum.UpdateGoalDonation) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayUpdateGoalDonation = modal.state == ModalStateEnum.Opened;
          } else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.getDonationInfos();
          }
        }
      })
    );

    from(this.donationDatastoreService.list(this.memorialId)).subscribe((listDonations) => {
      this.listDonations = listDonations;
      this.loadingDone = true;
    });

    from(this.memorialDatastoreService.getMemorialUserRelationship(this.memorialId)).subscribe((userRelationship) => {
      this.currentRelationship = userRelationship;
    });

    this.getDonationInfos();
  }

  async getDonationInfos() {
    from(this.donationDatastoreService.donationGoal(this.memorialId)).subscribe((donationGoal) => {
      this.donationGoal = donationGoal.donationGoal
      this.amountTotal = donationGoal.totalAmountDonation
      this.messageDonation = donationGoal.message
    });
  }

  updateGoalDonation() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.UpdateGoalDonation);
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
  }

  addDonation() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.AddDonation);
  }
}

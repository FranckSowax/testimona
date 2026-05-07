import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { DonationDatastoreService } from '../../services/donation-datastore.service';
import { environment } from 'src/environments/environment';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { MemorialDatastoreService } from '../../../memorial/services/memorial-datastore.service';
import { MemorialModel } from '../../../memorial/models/memorial.model';

@Component({
  selector: 'app-add-donation',
  templateUrl: './add-donation.component.html',
  styleUrls: ['./add-donation.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'donation' }
    }
  ],
})
export class AddDonationComponent implements OnInit {
  @Input('memorialId') memorialId: number;
  @Input('memorialUrl') memorialUrl: string;

  public loadingDone: boolean = false;

  public assetUrl = environment.assetUrl;
  public memorialItem: MemorialModel;

  private _isAnonymous: boolean = false;

  constructor(
    private _donationDatastoreService: DonationDatastoreService,
    private _memorialDatastoreService: MemorialDatastoreService,
    private _modalDatastoreService: ModalDatastoreService,
    private _translocoService: TranslocoService
  ) { }

  ngOnInit(): void {
    this._memorialDatastoreService.getMemorial(this.memorialUrl)
      .subscribe((memorialItem) => {
        if (memorialItem != null) {
          this.memorialItem = memorialItem;
        }
        this.loadingDone = true;
    });
  }

  updateAnonymousStatus() {
    this._isAnonymous = !this._isAnonymous;
  }

  closeModal(modalState?: ModalStateEnum) {
    this._modalDatastoreService.close(ModalNameEnum.AddDonation, modalState);
  }

  async makeDonation(): Promise<void> {
    const donationId = await this._donationDatastoreService.startProcessMakeDonation(this.memorialId, this._isAnonymous);
    if (donationId != '') {
      window.open(`${environment.donation}?client_reference_id=${donationId}&locale=${this.returnStripeLanguage(this._translocoService.getActiveLang())}`, '_self');
    }
  }

  private returnStripeLanguage(userLanguage: string): string {
    switch(userLanguage) {
      case 'fr':
        return 'fr-CA';
      default:
        return 'en';
    }
  }
}

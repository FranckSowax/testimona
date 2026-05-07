import { Component, Input, OnInit } from '@angular/core';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-donation-success',
  templateUrl: './donation-success.component.html',
  styleUrls: ['./donation-success.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'donation' }
    }
  ],
})
export class DonationSuccessComponent implements OnInit {
  @Input('donationId') donationId: string;
  public assetUrl = environment.assetUrl;

  constructor(
    private modalDatastoreService: ModalDatastoreService,
  ) { }

  ngOnInit(): void {
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.SuccessDonation, modalState);
  }
}

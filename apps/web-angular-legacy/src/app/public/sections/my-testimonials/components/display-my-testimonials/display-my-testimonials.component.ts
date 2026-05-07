import { Component, Input, OnInit } from '@angular/core';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { combineLatest, Subscription } from 'rxjs';
import { MyTestimonialsDatastoreService } from '../../services/my-testimonials-datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { Router } from '@angular/router';
import { MyTestimonialsModel } from '../../models/my-testimonials.model';
import { Clipboard } from '@angular/cdk/clipboard';
import { environment } from 'src/environments/environment';
import { KeyValuePairModel } from 'src/app/shared/models/key-value-pair.model';

@Component({
  selector: 'app-display-my-testimonials',
  templateUrl: './display-my-testimonials.component.html',
  styleUrls: ['./display-my-testimonials.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'mytestimonials' }
    },
  ],
})
export class DisplayMyTestimonialsComponent implements OnInit {
  private _subscriptions = new Subscription();
  public errorListMyTestimonials: string;
  public listOfMyTestimonials: MyTestimonialsModel[];
  public loadingDone: boolean = false;
  public listOfMyTestimonialsLength: number;
  public assetUrl = environment.assetUrl;
  public relativeString: string;
  @Input('relatives') relativeList: Array<KeyValuePairModel>;


  constructor(
    private myTestimonialsDatastoreService: MyTestimonialsDatastoreService,
    private router: Router,
    private translocoService: TranslocoService,
    private clipboard: Clipboard
  ) { }

  ngOnInit(): void {
    this._subscriptions.add(
      this.myTestimonialsDatastoreService.ErrorMyTestimonialsDatastore$.subscribe((errorResult) => {
        this.errorListMyTestimonials = '';
        if (errorResult != ApiResultResponseEnum.NoError) {
          switch (errorResult) {
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.DataNotFound:
              this.router.navigate(["404"]);
              break;
            default:
              this.errorListMyTestimonials = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );

    (async () => {
      combineLatest([
        this.myTestimonialsDatastoreService.getMyTestimonialsList(),
      ])
        .subscribe(([listOfMyTestimonials]) => {
          this.listOfMyTestimonials = listOfMyTestimonials;
          this.listOfMyTestimonialsLength = listOfMyTestimonials.length;
          this.loadingDone = true;
          console.log(this.listOfMyTestimonials)
        },
        (err) => {
          console.log(err);
          this.loadingDone = true;
        });
      })();
  }

  shareTestimona() {
    this.clipboard.copy(location.href);
  }

}

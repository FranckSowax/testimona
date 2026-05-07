import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MemorialSearchResultModel } from '../../models/memorial-search.model';
import { SearchParentSourceEnum } from '../../enums/search-parent-source.enum';
import { SearchDatastoreService } from '../../datastores/search.datastore.service';
import { SelectedMemorialSearchModel } from '../../models/search-result.model';
import { MatLegacyAutocompleteTrigger as MatAutocompleteTrigger } from '@angular/material/legacy-autocomplete';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { ConfigurationDatastoreService } from '../../datastores/configuration.datastore.service';

@Component({
  selector: 'shared-search-memorial',
  templateUrl: './search-memorial.component.html',
  styleUrls: ['./search-memorial.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'shared' }
    },
  ],
})
export class MemorialSearchComponent implements OnInit, OnDestroy {
  @Input('source') source: SearchParentSourceEnum;

  @ViewChild('search_input', { static: true }) searchInput: ElementRef<HTMLInputElement>;
  public searchResult: MemorialSearchResultModel[] = null;
  public inputFullsize: boolean;
  public svgSearchIcon = environment.assetUrl + 'search.svg';

  private searchTextMemorial$ = new Subject<string>();
  private numberOfResult: number = 10;

  @Output() resultOnClick: EventEmitter<SelectedMemorialSearchModel> = new EventEmitter<SelectedMemorialSearchModel>();

  private _subscription = new Subscription();

  constructor(private searchDatastoreService: SearchDatastoreService, private configurationDatastoreService: ConfigurationDatastoreService, private appShellService: AppShellService) { }

  ngOnInit() {
    (async () => {
      const memorialConfiguration = await this.configurationDatastoreService.memorialConfiguration(this.appShellService.getActiveLanguage());
      if(!memorialConfiguration) return;

      this._subscription.add(
        this.searchDatastoreService.searchMemorial(this.searchTextMemorial$, this.numberOfResult, memorialConfiguration.countries)
            .subscribe((result: MemorialSearchResultModel[] | []) => {
              this.searchResult = result;
            })
      );
    })();

    this.inputFullsize = this.source != SearchParentSourceEnum.Header;
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  search(): void {
    this.searchResult = null;
    if (!this.searchInput.nativeElement.value.trim()) {
      return;
    }

    this.searchTextMemorial$.next(this.searchInput.nativeElement.value);
  }

  memorialOnClick(item: MemorialSearchResultModel): void {
    if (this.source == SearchParentSourceEnum.Header) {
      this.resultOnClick.emit({ memorialId: item.id, memorialUrl: item.url });
      return;
    } else if (this.source == SearchParentSourceEnum.CreateTestimona) {
      this.resultOnClick.emit({ memorialId: item.id, memorialUrl: item.url });
      return;
    }

    return;
  }

  openCloseSearchResults(event: Event, trigger: MatAutocompleteTrigger): void {
    event.stopPropagation();

    if (trigger.panelOpen)
      trigger.closePanel();
    else
      trigger.openPanel();
  }
}

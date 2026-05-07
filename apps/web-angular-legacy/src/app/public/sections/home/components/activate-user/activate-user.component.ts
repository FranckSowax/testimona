import { Component, Input, OnInit } from '@angular/core';
import { ActivateUserDatastoreService } from '../../services/activate-user.datastore.service';
import { from } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-activate-user',
  templateUrl: './activate-user.component.html',
  styleUrls: ['./activate-user.component.scss']
})
export class ActivateUserComponent implements OnInit {
  @Input() userId: string;

  public loadingDone: boolean;
  public assetUrl = environment.assetUrl;

  constructor(private activateUserDatastoreService: ActivateUserDatastoreService) { }

  ngOnInit(): void {
    from(this.activateUserDatastoreService.activateUser(this.userId))
      .subscribe((resultActivation: boolean) => {
        this.loadingDone = true;
      });
  }
}

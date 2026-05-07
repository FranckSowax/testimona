import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-menu',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminMenuComponent implements OnInit {
  public assetUrl = environment.assetUrl;

  constructor() { }

  ngOnInit(): void {
  }

}

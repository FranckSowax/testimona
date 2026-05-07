import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InformationPageEnum } from 'src/app/shared/enums/information-page.enum';
import { EnumHelpers } from 'src/app/shared/helpers/enum.helper';

@Component({
  selector: 'app-information',
  templateUrl: './information.component.html',
  styleUrls: ['./information.component.scss'],
})
export class InformationComponent implements OnInit {
  public informationPage: InformationPageEnum;
  public informationPageEnum = InformationPageEnum;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.informationPage = InformationPageEnum[EnumHelpers.getEnumKeyByEnumValue(InformationPageEnum, this.router.url.slice(1))];
  }
}

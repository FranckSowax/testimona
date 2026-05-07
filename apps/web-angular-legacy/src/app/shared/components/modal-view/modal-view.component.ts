import { Component, ElementRef, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ModalViewModel } from '../../models/modal-view.model';
import { ModalDatastoreService } from '../../datastores/modal.datastore.service';
import { ModalNameEnum } from '../../enums/modal.enum';
import { Router } from '@angular/router';

@Component({
  selector: 'shared-modal-view',
  templateUrl: './modal-view.component.html',
  styleUrls: ['./modal-view.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ModalViewComponent implements OnInit, OnDestroy {

  @Input() modalData: ModalViewModel;

  public isAuthentication = false;
  public isAuthenticationFullScreen = false;

  private element: any;

  constructor(private modalDatastoreService: ModalDatastoreService, private elementRef: ElementRef, private router: Router) {
    this.element = elementRef.nativeElement;
  }

  ngOnInit(): void {
    // ensure id attribute exists
    if (!this.modalData?.id) {
      console.error('modal must have an id');
      return;
    }

    // move element to bottom of page (just before </body>) so it can be displayed above everything else
    document.body.appendChild(this.element);

    // close modal on background click
    this.element.addEventListener('click', (el: any) => {
      if (el.target.className === 'modal') {
        this.close();
      }
    });

    // add self (this modal instance) to the modal service so it's accessible from controllers
    this.modalDatastoreService.add(this);
  }

  // remove self from modal service when component is destroyed
  ngOnDestroy(): void {
    this.modalDatastoreService.remove(this.modalData?.id!);
    this.element.remove();
  }

  // open modal
  open(): void {
    this.isAuthentication = (this.modalData.id == ModalNameEnum.Register || this.modalData.id == ModalNameEnum.Signin);
    this.isAuthenticationFullScreen = this.isAuthentication && (this.router.url != '' && this.router.url != '/');
    this.element.style.display = 'block';
    document.body.classList.add('modal-open');
  }

  // close modal
  close(): void {
    this.element.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
}

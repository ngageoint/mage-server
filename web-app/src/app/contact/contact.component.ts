import { Component, OnChanges, Input, Output, EventEmitter, SimpleChanges, Inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../api/api.service';
import { ContactDialogComponent } from './contact-dialog.component';

@Component({
  selector: 'contact',
  template: '<div></div>'
})
export class ContactComponent implements OnChanges {
  @Input() open: any;
  @Input() info: any;
  @Input() strategy: any;
  @Input() api: any;
  @Output() onContactClose = new EventEmitter<void>();

  constructor(
    public dialog: MatDialog,
    @Inject(ApiService) public apiService: ApiService) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.open && this.open.opened && this.dialog.openDialogs.length === 0) {
      if (this.api) {
        this.openContactDialog();
      } else {
        this.apiService.getApi().subscribe((api: any) => {
          this.api = api;
          this.openContactDialog();
        }, () => {
          //TODO error
        });
      }
    }
  }

  openContactDialog(): void {

    const data = {
      info: this.info,
      strategy: this.strategy,
      api: this.api
    };

    this.dialog.open(ContactDialogComponent, {
      width: '500px',
      data: data
    }).afterClosed().subscribe(result => {
      if (!result || result === 'closeAction') {
        this.onContactClose.emit();
      }
    });
  }
}
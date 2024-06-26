import { Component, EventEmitter, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FilterComponent } from '../filter/filter.component';

@Component({
  selector: 'navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  @Output() onFeedToggle = new EventEmitter<void>();

  state = "map"

  constructor(public dialog: MatDialog) { }

  openMenu(): void {
    
  }

  toggleFeed(): void {
    this.onFeedToggle.emit()
  }

  onFilter(): void {
    const dialogRef = this.dialog.open(FilterComponent, {
      height: '580px',
      width: '675px',
      data: {  }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }

}

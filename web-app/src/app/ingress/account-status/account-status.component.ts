import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
    selector: 'account-status',
    templateUrl: './account-status.component.html',
    styleUrls: ['./account-status.component.scss'],
    standalone: false
})
export class AccountStatusComponent implements OnChanges {
  @Input() status: 'active' | 'inactive' | 'disabled'
  @Output() complete = new EventEmitter<void>()

  icon: string
  title: string
  message: string

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['status'].currentValue === 'active') {
      this.icon = "check_circle"
      this.title = "Account Created"
      this.message = "Your account has been successfully created."
    } else if (changes['status'].currentValue === 'inactive') {
      this.icon = "preliminary"
      this.title = "Account Pending"
      this.message = "Your account has been successfully created. A Mage administrator will need to activate your account before you can log in."
    } else if (changes['status'].currentValue === 'disabled') {
      this.icon = "block"
      this.title = "Account Disabled"
      this.message = "Your account has been disabled. Please contact a Mage administrator for assistance."
    }
  }

  onDone(): void {
    this.complete.emit()
  }
}
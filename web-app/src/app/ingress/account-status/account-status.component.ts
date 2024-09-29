import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'account-status',
  templateUrl: './account-status.component.html',
  styleUrls: ['./account-status.component.scss']
})
export class AccountStatusComponent implements OnChanges {
  @Input() active: boolean
  @Output() complete = new EventEmitter<void>()

  icon: string
  color: string
  title: string
  message: string

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['active'].currentValue === true) {
      this.icon = "check_circle"
      this.color = "#4CAF50"
      this.title = "Account Created"
      this.message = "Your account has been successfully created."
    } else if (changes['active'].currentValue === false) {
      this.icon = "preliminary"
      this.color = "#FFA000"
      this.title = "Account Pending"
      this.message = "Your account has been successfully created. A Mage administrator will need to activate your account before you can log in."
    }
  }

  onDone(): void {
    this.complete.emit()
  }
}
import { Component, EventEmitter, Input, Output } from '@angular/core'

@Component({
  selector: 'authentication-button',
  templateUrl: './authentication-button.component.html',
  styleUrls: ['./authentication-button.component.scss']
})
export class AuthenticationButtonComponent {
  @Input() icon: string
  @Input() color: string
  @Input() text: string
  @Input() textColor: string

  @Output() click = new EventEmitter<void>()

  onClick(): void {
    this.click.emit()
  }
}

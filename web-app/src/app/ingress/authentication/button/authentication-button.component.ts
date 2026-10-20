import { Component, computed, input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { authenticationButtonText } from '../../../api/api.entity'

@Component({
    selector: 'authentication-button',
    templateUrl: './authentication-button.component.html',
    styleUrls: ['./authentication-button.component.scss'],
    imports: [MatButtonModule]
})
export class AuthenticationButtonComponent {
  readonly icon = input<string>()
  readonly color = input<string>()
  readonly text = input<string>()
  readonly buttonText = input<string>()
  readonly textColor = input<string>()

  readonly authenticate = output<void>()

  readonly label = computed(() => authenticationButtonText(this.text(), this.buttonText()))

  onClick(): void {
    this.authenticate.emit()
  }
}

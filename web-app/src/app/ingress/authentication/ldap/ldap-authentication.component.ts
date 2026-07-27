import { Component, EventEmitter, Input, Output, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Api, AuthenticationStrategy } from '../../../api/api.entity'
import { UserService } from '../../../user/user.service'
import { LinkGenerator } from '../../../contact/utilities/link-generator'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { AuthenticationButtonComponent } from '../button/authentication-button.component'

@Component({
    selector: 'ldap-authentication',
    templateUrl: './ldap-authentication.component.html',
    styleUrls: ['./ldap-authentication.component.scss'],
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        AuthenticationButtonComponent
    ]
})
export class LdapAuthenticationComponent {
  @Input() api: Api
  @Input() strategy: AuthenticationStrategy

  @Output() authenticated = new EventEmitter<any>();

  authenticationForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  })

  contact = signal<string | undefined>(undefined)

  error = signal<{
    title: string,
    message: string
  } | undefined>(undefined)

  constructor(
    private userService: UserService
  ) {}

  onSignin(): void {
    if (this.authenticationForm.invalid) {
      return
    }

    const { username, password } = this.authenticationForm.value
    this.userService.ldapSignin(username, password).subscribe({
      next: (response: any) => {
        this.authenticated.emit(response)
      },
      error: (response: any) => {
        this.error.set({
          title: 'Error Signing In',
          message: response.error || 'Please check your username and password and try again.'
        })

        const email = LinkGenerator.emailLink(this.api?.contactInfo, response.error, username, this.strategy)
        const phone = LinkGenerator.phoneLink(this.api?.contactInfo)
        this.contact.set(`Should you need futher assistance you may contact your Mage administrator via ${[`<a href=${email}>email</a>`, `<a href=${phone}>phone</a>`].join(' or ')}.`)
      }
    })
  }
}

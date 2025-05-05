import { Component, EventEmitter, Input, Output } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { Api, AuthenticationStrategy } from '../../../api/api.entity'
import { UserService } from '../../../user/user.service'
import { LinkGenerator } from '../../../contact/utilities/link-generator'

@Component({
  selector: 'ldap-authentication',
  templateUrl: './ldap-authentication.component.html',
  styleUrls: ['./ldap-authentication.component.scss']
})
export class LdapAuthenticationComponent {
  @Input() api: Api
  @Input() strategy: AuthenticationStrategy

  @Output() authenticated = new EventEmitter<any>();
  
  authenticationForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  })
  
  contact: string

  error: {
    title: string,
    message: string
  }

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
        this.error = {
          title: 'Error Signing In',
          message: response.error || 'Please check your username and password and try again.'
        }

        const email = LinkGenerator.emailLink(this.api.contactInfo, response.error, username, this.strategy)
        const phone = LinkGenerator.phoneLink(this.api.contactInfo)
        this.contact = `Should you need futher assistance you may contact your Mage administrator via ${[`<a href=${email}>email</a>`, `<a href=${phone}>phone</a>`].join(' or ')}.`
      }
    }) 
  }
}

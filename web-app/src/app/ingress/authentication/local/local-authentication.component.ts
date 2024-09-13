import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../api/api.service';
import { LinkGenerator } from '../../../contact/utilities/link-generator'
import { animate, style, transition, trigger } from '@angular/animations';
import { Api, AuthenticationStrategy } from '../../../../app/api/api.entity';
import { UserService } from '../../../user/user.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'local-authentication',
  templateUrl: './local-authentication.component.html',
  styleUrls: ['./local-authentication.component.scss'],
  animations: [
    trigger('slide', [
      transition(':enter', [
        style({ 'height': '0px', opacity: 0 }),
        animate('250ms ease-out', style({ 'height': '*', opacity: 1 })),
      ]),
      transition(":leave", [
        animate('250ms ease-out', style({ 'height': '0px', opacity: 0 })),
      ])
    ]),
  ]
})
export class LocalAuthenticationComponent implements OnInit {
  @Input() api: Api
  @Input() strategy: AuthenticationStrategy
  @Input() landing: boolean

  @Output() signup = new EventEmitter<void>()
  @Output() authenticated = new EventEmitter<any>()

  authenticationForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  })

  error: {
    title: string,
    message: string
  }

  contact: SafeHtml

  test: SafeHtml

  constructor(
    private apiService: ApiService,
    private userService: UserService,
    private sanitizer: DomSanitizer
  ) {
    this.test = this.sanitizer.bypassSecurityTrustHtml('<a href="www.google.com">I am a link</a>')
    // this.test = this.sanitizer.bypassSecurityTrustHtml('<h1 style="color:red">Hello World</h1>')
  }

  ngOnInit(): void {
    this.apiService.getApi().subscribe((api: any) => {
      this.api = api
    })
  }

  onSignin() {
    if (this.authenticationForm.invalid) {
      return
    }

    const { username, password } = this.authenticationForm.value
    this.userService.signin(username, password).subscribe({
      next: (response) => {
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

  onSignup(): void {
    this.signup.emit()
  }
}

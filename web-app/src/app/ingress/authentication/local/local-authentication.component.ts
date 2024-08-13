import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ApiService } from '../../../api/api.service';
import { LinkGenerator } from '../../../../app/contact/utilities/link-generator';
import { animate, style, transition, trigger } from '@angular/animations';
import { Router } from '@angular/router';
import { Api, AuthenticationStrategy } from '../../../../app/api/api.entity';
import { UserService } from '../../../../app/user/user.service';

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
  ],
})
export class LocalAuthenticationComponent implements OnInit {
  @Input() api: Api
  @Input() strategy: AuthenticationStrategy
  @Input() landing: boolean

  @Output() authenticated = new EventEmitter<any>();

  username = new FormControl('', [Validators.required]);
  password = new FormControl('', [Validators.required]);

  error: {
    title: string,
    message: string
  }

  contact: string

  constructor(
    private router: Router,
    private apiService: ApiService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.apiService.getApi().subscribe((api: any) => {
      this.api = api
    })
  }

  onSignin() {
    this.userService.signin(this.username.value, this.password.value).subscribe({
      next: (response) => {
        this.authenticated.emit(response)
      },
      error: (response: any) => {
        this.error = {
          title: 'Error Signing In',
          message: response.error || 'Please check your username and password and try again.'
        }

        const email = LinkGenerator.emailLink(this.api.contactInfo, response.error, this.username.value, this.strategy)
        const phone = LinkGenerator.phoneLink(this.api.contactInfo)
        this.contact = `Should you need futher assistance you may contact your Mage administrator via ${[`<a href=${email}>email</a>`, `<a href=${phone}>phone</a>`].join(' or ')}.`
      }
    })
  }

  onSignup(): void {
    this.router.navigate(['landing', 'signup']);
  }
}

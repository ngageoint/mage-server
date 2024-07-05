import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthenticationStrategy } from '../../api/api.entity';
import { UserService } from '../../user/user.service';
import { FormControl, Validators } from '@angular/forms';
import { ApiService } from 'src/app/api/api.service';
import { LinkGenerator } from 'src/app/contact/utilities/link-generator';
import { animate, style, transition, trigger } from '@angular/animations';
import { Router } from '@angular/router';

@Component({
  selector: 'local-authentication',
  templateUrl: './local.component.html',
  styleUrls: ['./local.component.scss'],
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
  @Input() strategy: AuthenticationStrategy
  @Input() hideSignup: boolean

  @Output() onSignin = new EventEmitter<any>();
  @Output() onSignup = new EventEmitter<any>();

  api: any
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

  signin() {
    this.userService.signin(this.username.value, this.password.value).subscribe({
      next: (response: any) => {
        this.onSignin.emit(response)
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

  signup(): void {
    this.router.navigate(['landing', 'signup']);
  }
}

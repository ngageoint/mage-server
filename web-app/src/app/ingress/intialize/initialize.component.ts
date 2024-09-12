import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { PasswordStrength, passwordStrengthScores } from '../../entities/entities.password';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core'
import { InitializeService } from './initialize.service';
import { UserService } from '../../user/user.service';
import { User } from 'core-lib-src/user';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common'
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en'
import { animate, style, transition, trigger } from '@angular/animations';

export interface InitializedEvent {
  token: string
}

@Component({
  selector: 'initialize',
  templateUrl: './initialize.component.html',
  styleUrls: ['./initialize.component.scss'],
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
export class InitializeComponent implements OnInit {
  @Output() initialized = new EventEmitter<InitializedEvent>()

  passwordStrength?: PasswordStrength

  account = new FormGroup({
    username: new FormControl<string>('', [Validators.required]),
    password: new FormControl<string>('', [Validators.required]),
    passwordconfirm: new FormControl<string>('', [Validators.required]),
    accessCode: new FormControl<string>('', [Validators.required])
  })

  error: {
    title: string,
    message: string
  }

  constructor(
    private userService: UserService,
    private initializeService: InitializeService
  ) {}

  ngOnInit(): void {
    zxcvbnOptions.setOptions({
      dictionary: {
        ...zxcvbnCommonPackage.dictionary,
        ...zxcvbnEnPackage.dictionary,
      },
      graphs: zxcvbnCommonPackage.adjacencyGraphs,
      translations: zxcvbnEnPackage.translations,
    })
  }

  onPasswordChanged(password: string) {
    if (password && password.length > 0) {
      const score = password && password.length ? zxcvbn(password, [this.account.controls.username.value]).score : 0;
      this.passwordStrength = passwordStrengthScores[score]
    } else {
      this.passwordStrength = passwordStrengthScores[0]
    }
  }

  onInitialize(): void {
    // TODO ensure for valid
    if (this.account.controls.password.value !== this.account.controls.passwordconfirm.value) {
      this.account.controls.password.setErrors({
        match: true
      });
    } else {
      if (this.account.controls.password.value.length < 1) {
        this.account.controls.password.setErrors({ required: true });
      } else {
        this.account.controls.password.setErrors(null);
      }
    }
    this.account.markAllAsTouched()

    const { username, password, accessCode } = this.account.value
    this.initializeService.initialize(username, password, accessCode).subscribe({
      next: () => {
        this.userService.signin(username, password).subscribe({
          next: (response: { user: User, token: string }) => {
            this.userService.authorize(response.token, accessCode).subscribe({
              next: (response: { user: User, token: string }) => {
                this.initialized.emit({ token: response.token })
              }
            })
          }
        })
      },
      error: (response: any) => {
        this.error = {
          title: 'Could not create account',
          message: response.error
        }
      }
    })
  }
}

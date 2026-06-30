import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { UserService } from 'mage-web-app/user/user.service';
import { SigninEvent } from '../auth.types';
import { AuthenticationStrategy } from '../local-signin/local-signin.component';

export interface ApiAuthenticationStrategies {
    local?: AuthenticationStrategy;
    [key: string]: AuthenticationStrategy | undefined;
}

export interface Api {
    authenticationStrategies: ApiAuthenticationStrategies;
    disclaimer?: {
        show: boolean;
        text?: string;
    };
    version?: {
        major: number;
        minor: number;
        micro: number;
    };
    initial?: boolean;
}

@Component({
    selector: 'signin',
    templateUrl: './signin.component.html',
    styleUrls: ['./signin.component.scss']
})
export class SigninComponent implements OnInit {
    @Input() api: Api;
    @Input() hideSignup = false;
    @Output() onSignin = new EventEmitter<SigninEvent>();
    @Output() onSignup = new EventEmitter<{ strategy: AuthenticationStrategy }>();

    localAuthenticationStrategy: AuthenticationStrategy | null = null;
    thirdPartyStrategies: AuthenticationStrategy[] = [];

    constructor(
        private userService: UserService,
    ) { }

    ngOnInit(): void {
        const localStrategy = this.api.authenticationStrategies?.local;
        if (localStrategy) {
            this.localAuthenticationStrategy = { ...localStrategy, name: 'local' };
        }

        this.thirdPartyStrategies = Object.entries(this.api.authenticationStrategies || {})
            .filter(([name]) => name !== 'local')
            .map(([name, strategy]) => ({ ...strategy, name }));
    }

    signin(event: SigninEvent): void {
        this.onSignin.emit(event);
    }

    signupClicked(): void {
        if (this.localAuthenticationStrategy) {
            this.onSignup.emit({ strategy: this.localAuthenticationStrategy });
        }
    }
}

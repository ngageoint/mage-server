import { Component, OnInit, Input } from '@angular/core';
import { Strategy } from '../../../admin-authentication/admin-settings.model';

@Component({
    selector: 'password-policy',
    templateUrl: 'password-policy.component.html',
    styleUrls: ['./password-policy.component.scss']
})
export class PasswordPolicyComponent implements OnInit {
    @Input() strategy: Strategy;

    ngOnInit(): void {
        if (this.strategy.settings.passwordPolicy) {
            this.buildPasswordHelp();
            this.strategy.isDirty = false;
        }
    }

    buildPasswordHelp(): void {
        if (this.strategy.settings.passwordPolicy) {
            if (!this.strategy.settings.passwordPolicy.customizeHelpText) {
                const policy = this.strategy.settings.passwordPolicy
                const templates = Object.entries(policy.helpTextTemplate)
                    .filter(([key]) => policy[`${key}Enabled`] === true)
                    .map(([key, value]) => {
                        return (value as string).replace('#', policy[key])
                    });

                this.strategy.settings.passwordPolicy.helpText = `Password is invalid, must ${templates.join(' and ')}.`;
                this.strategy.isDirty = true;
            }
        }
    }
}
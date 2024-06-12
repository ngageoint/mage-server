import { Component, Input } from '@angular/core';
import { Strategy } from '../../../admin-authentication/admin-settings.model';

@Component({
    selector: 'password-policy',
    templateUrl: 'password-policy.component.html',
    styleUrls: ['./password-policy.component.scss']
})
export class PasswordPolicyComponent {
    @Input() strategy: Strategy
}
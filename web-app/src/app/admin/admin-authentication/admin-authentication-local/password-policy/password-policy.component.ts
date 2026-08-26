import { Component, Input, EventEmitter, Output } from '@angular/core';
import { Strategy } from '../../../admin-authentication/admin-settings.model';

@Component({
    selector: 'password-policy',
    templateUrl: 'password-policy.component.html',
    styleUrls: ['./password-policy.component.scss'],
    standalone: false
})
export class PasswordPolicyComponent {
    @Input() strategy: Strategy;
    @Output() strategyDirty = new EventEmitter<boolean>();

    setDirty(isDirty: boolean): void {
        this.strategy.isDirty = isDirty;
        this.strategyDirty.emit(isDirty);
    }
}
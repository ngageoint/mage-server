import { Component, input, output } from '@angular/core';
import { Strategy } from '../../../admin-authentication/admin-settings.model';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'password-policy',
    templateUrl: 'password-policy.component.html',
    styleUrls: ['./password-policy.component.scss'],
    imports: [
        FormsModule,
        MatSlideToggleModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule
    ]
})
export class PasswordPolicyComponent {
    readonly strategy = input.required<Strategy>();
    readonly strategyDirty = output<boolean>();

    setDirty(isDirty: boolean): void {
        this.strategy().isDirty = isDirty;
        this.strategyDirty.emit(isDirty);
    }
}
import { Component, OnInit, input, output } from '@angular/core';
import { Strategy, AdminChoice } from '../../../admin-authentication/admin-settings.model';
import { MaxLock } from './account-lock.model';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';


@Component({
    selector: 'account-lock',
    templateUrl: 'account-lock.component.html',
    styleUrls: ['./account-lock.component.scss'],
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule
    ]
})
export class AccountLockComponent implements OnInit {
    readonly strategy = input.required<Strategy>();
    readonly strategyDirty = output<boolean>();

    readonly accountLockChoices: AdminChoice[] = [{
        title: 'Off',
        description: 'Do not lock Mage user accounts.',
        value: false
    }, {
        title: 'On',
        description: 'Lock Mage user accounts for defined time \n after defined number of invalid login attempts.',
        value: true
    }];
    // no signal - set once
    maxLock: MaxLock = {
        enabled: false
    };
    readonly maxLockChoices: AdminChoice[] = [{
        title: 'Off',
        description: 'Do not disable Mage user accounts.',
        value: false
    }, {
        title: 'On',
        description: 'Disable Mage user accounts after account has been locked defined number of times.',
        value: true
    }];

    ngOnInit(): void {
        const strategy = this.strategy();
        if (strategy.type === 'local') {
            this.maxLock.enabled = strategy.settings.accountLock && strategy.settings.accountLock.max !== undefined;

            if (!this.maxLock.enabled) {
                delete strategy.settings.accountLock.max;
            }
        }
    }

    setDirty(isDirty: boolean): void {
        this.strategy().isDirty = isDirty;
        this.strategyDirty.emit(isDirty);
    }
}
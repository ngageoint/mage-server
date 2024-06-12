import { Component, Input, OnInit } from '@angular/core';
import { Strategy, AdminChoice } from '../../../admin-authentication/admin-settings.model';

@Component({
    selector: 'account-lock',
    templateUrl: 'account-lock.component.html',
    styleUrls: ['./account-lock.component.scss']
})
export class AccountLockComponent implements OnInit {
    @Input() strategy: Strategy;
    accountLockState: AdminChoice
    maxLockState: AdminChoice

    readonly accountLockEnabled: AdminChoice = {
        title: 'Enabled',
        description: 'Lock MAGE user accounts for defined time after defined number of invalid login attempts.',
        value: true
    }

    readonly accountLockDisabled: AdminChoice = {
        title: 'Disabled',
        description: 'Do not lock MAGE user accounts.',
        value: false
    }

    readonly maxLockEnabled: AdminChoice = {
        title: 'Enabled',
        description: 'Disable MAGE user accounts after account has been locked defined number of times.',
        value: true
    }

    readonly maxLockDisabled: AdminChoice = {
        title: 'Disabled',
        description: 'Do not disable MAGE user accounts.',
        value: false
    }

    ngOnInit(): void {
        this.accountLockState = this.strategy.settings.accountLock?.enabled ? this.accountLockEnabled : this.accountLockDisabled
        this.maxLockState = this.strategy.settings.accountLock.max ? this.accountLockEnabled : this.accountLockDisabled
    }
}
import { Component, OnInit, Input } from '@angular/core';
import { Strategy, AdminChoice, MaxLock } from '../../admin-settings.model';

@Component({
    selector: 'account-lock',
    templateUrl: 'account-lock.component.html',
    styleUrls: ['./account-lock.component.scss']
})
export class AccountLockComponent implements OnInit {
    @Input() strategy: Strategy;

    readonly accountLockChoices: AdminChoice[] = [{
        title: 'Off',
        description: 'Do not lock MAGE user accounts.',
        value: false
    }, {
        title: 'On',
        description: 'Lock MAGE user accounts for defined time \n after defined number of invalid login attempts.',
        value: true
    }];
    maxLock: MaxLock = {
        enabled: false
    };
    readonly maxLockChoices: AdminChoice[] = [{
        title: 'Off',
        description: 'Do not disable MAGE user accounts.',
        value: false
    }, {
        title: 'On',
        description: 'Disable MAGE user accounts after account has been locked defined number of times.',
        value: true
    }];

    ngOnInit(): void {
        if (this.strategy.type === 'local') {
            this.maxLock.enabled = this.strategy.settings.accountLock && this.strategy.settings.accountLock.max !== undefined;
        }
    }
}
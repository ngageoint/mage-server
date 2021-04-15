import { OnInit, Component, Input } from '@angular/core';

export interface GenericSetting {
    key: string,
    value: string
}

@Component({
    selector: 'generic-settings',
    templateUrl: 'generic-settings.component.html',
    styleUrls: ['./generic-settings.component.scss']
})
export class GenericSettingsComponent implements OnInit {
    @Input() strategy: any;
    dataSource: GenericSetting[] = [];
    displayedColumns: string[] = ['key', 'value'];

    ngOnInit(): void {
        for (const [key, value] of Object.entries(this.strategy.settings)) {

            if (key === 'accountLock' || key === 'devicesReqAdmin' || key === 'usersReqAdmin'
                || key === 'passwordPolicy' || key === 'newUserTeams' || key === 'newUserEvents') {
                continue;
            }
            const gs: GenericSetting = {
                key: key,
                value: value as string
            };
            this.dataSource.push(gs);
        }
    }
}
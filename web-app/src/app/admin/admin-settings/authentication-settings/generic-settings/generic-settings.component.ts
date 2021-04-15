import { OnInit, Component, Input } from '@angular/core';
import { GenericSetting } from './generic-settings.model';

@Component({
    selector: 'generic-settings',
    templateUrl: 'generic-settings.component.html',
    styleUrls: ['./generic-settings.component.scss']
})
export class GenericSettingsComponent implements OnInit {
    @Input() strategy: any;
    dataSource: GenericSetting[] = [];
    displayedColumns: string[] = ['key', 'value'];
    settingsKeysToIgnore: string[] = ['accountLock', 'devicesReqAdmin', 'usersReqAdmin', 'passwordPolicy', 'newUserTeams', 'newUserEvents'];

    ngOnInit(): void {
        for (const [key, value] of Object.entries(this.strategy.settings)) {

            if (this.settingsKeysToIgnore.includes(key)) {
                continue;
            }

            let castedValue: string;

            if(value instanceof String){
                castedValue = value as string;
            } else {
                castedValue = JSON.stringify(value);
            }

            const gs: GenericSetting = {
                key: key,
                value: castedValue
            };
            this.dataSource.push(gs);
        }
    }
}
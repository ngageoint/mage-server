import { OnInit, Component, Input, ViewChild, AfterViewInit } from '@angular/core';
import { GenericSetting } from './generic-settings.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';

@Component({
    selector: 'generic-settings',
    templateUrl: 'generic-settings.component.html',
    styleUrls: ['./generic-settings.component.scss']
})
export class GenericSettingsComponent implements OnInit, AfterViewInit {
    @Input() strategy: any;
    dataSource: MatTableDataSource<GenericSetting>;
    displayedColumns: string[] = ['key', 'value'];
    settingsKeysToIgnore: string[] = ['accountLock', 'devicesReqAdmin', 'usersReqAdmin', 'passwordPolicy', 'newUserTeams', 'newUserEvents'];

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    ngOnInit(): void {
        const settings: GenericSetting[] = [];
        for (const [key, value] of Object.entries(this.strategy.settings)) {

            if (this.settingsKeysToIgnore.includes(key)) {
                continue;
            }

            let castedValue: string;

            if (value instanceof String) {
                castedValue = value as string;
            } else {
                castedValue = JSON.stringify(value);
            }

            const gs: GenericSetting = {
                key: key,
                value: castedValue
            };
            settings.push(gs);
        }

        this.dataSource = new MatTableDataSource(settings);
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }
}
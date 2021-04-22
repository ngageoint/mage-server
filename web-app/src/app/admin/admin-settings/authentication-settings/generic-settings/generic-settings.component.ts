import { OnInit, Component, Input, ViewChild, AfterViewInit } from '@angular/core';
import { GenericSetting } from './generic-settings.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Strategy } from '../../admin-settings.model';

@Component({
    selector: 'generic-settings',
    templateUrl: 'generic-settings.component.html',
    styleUrls: ['./generic-settings.component.scss']
})
export class GenericSettingsComponent implements OnInit, AfterViewInit {
    @Input() strategy: Strategy;
    dataSource: MatTableDataSource<GenericSetting>;
    readonly displayedColumns: string[] = ['key', 'value', 'delete'];
    readonly settingsKeysToIgnore: string[] = ['accountLock', 'devicesReqAdmin', 'usersReqAdmin', 'passwordPolicy', 'newUserTeams', 'newUserEvents'];
    newRow: GenericSetting = {
        key: '',
        value: ''
    }

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

    changeValue(setting: GenericSetting, $event: any): void {
        const idx = this.dataSource.data.indexOf(setting);
        if (idx > -1) {
            this.dataSource.data[idx].value = $event.target.textContent;
            this.strategy.settings[setting.key] = JSON.parse($event.target.textContent);
        }
    }

    addSetting(): void {
        const settings = this.dataSource.data;
        settings.push({ key: this.newRow.key, value: this.newRow.value });
        this.dataSource.data = settings;
        
        this.strategy.settings[this.newRow.key] = this.newRow.value;
        this.dataSource.paginator.firstPage();
        this.newRow.key = '';
        this.newRow.value = ''
    }

    deleteSetting(setting: GenericSetting): void {
        const settings = this.dataSource.data;
        const filtered = settings.filter(function (value, index, arr) {
            return value !== setting;
        });
        this.dataSource.data = filtered;

        delete this.strategy.settings[setting.key];
        this.dataSource.paginator.firstPage();
    }
}
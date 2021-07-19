import { OnInit, Component, Input, ViewChild, AfterViewInit } from '@angular/core';
import { GenericSetting } from './generic-settings.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Strategy } from '../../admin-settings.model';
import { MatDialog } from '@angular/material/dialog';
import { DuplicateKeyComponent } from './duplicate-key/duplicate-key.component';
import { EditSettingComponent } from './edit-setting/edit-setting.component';
import { DeleteSettingComponent } from './delete-setting/delete-setting.component';

@Component({
    selector: 'generic-settings',
    templateUrl: 'generic-settings.component.html',
    styleUrls: ['./generic-settings.component.scss']
})
export class GenericSettingsComponent implements OnInit, AfterViewInit {
    @Input() strategy: Strategy;
    @Input() editable = true;
    dataSource: MatTableDataSource<GenericSetting>;
    readonly displayedColumns: string[] = ['key', 'value', 'action'];
    readonly settingsKeysToIgnore: string[] = ['accountLock', 'devicesReqAdmin', 'usersReqAdmin', 'passwordPolicy', 'newUserTeams', 'newUserEvents'];
    newRow: GenericSetting = {
        displayKey: '',
        key: '',
        value: '',
        required: false
    }

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    constructor(private dialog: MatDialog) {

    }

    ngOnInit(): void {
        this.dataSource = new MatTableDataSource([]);
        this.refresh();
    }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    refresh(): void {
        this.dataSource.data = this.convertObjectToSettings(this.strategy.settings);
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    convertObjectToSettings(obj: any): GenericSetting[] {
        const settings: GenericSetting[] = [];
        for (const [key, value] of Object.entries(obj)) {

            if (this.settingsKeysToIgnore.includes(key)) {
                continue;
            }

            if (value) {
                if (typeof value == 'string') {
                    const castedValue = value as string;
                    //TODO detect if this field is required
                    const gs: GenericSetting = {
                        displayKey: key,
                        key: key,
                        value: castedValue,
                        required: true
                    };
                    settings.push(gs);
                } else {
                    const objSettings = this.convertObjectToSettings(value);
                    objSettings.forEach(setting => {
                        setting.key = key + "." + setting.key;
                        settings.push(setting);
                    })
                }
            }
        }

        return settings;
    }

    editSetting(setting: GenericSetting): void {
        this.dialog.open(EditSettingComponent, {
            width: '500px',
            data: setting,
            autoFocus: false
        }).afterClosed().subscribe(result => {
            if (result.event === 'confirm') {
                const updatedSetting = result.data;
                const key = updatedSetting.key;
                if (key.includes('.')) {
                    const keys = key.split('.');
                    this.strategy.settings[keys[0]][keys[1]] = updatedSetting.value;
                } else {
                    this.strategy.settings[updatedSetting.key] = updatedSetting.value;
                }
                this.strategy.isDirty = true;
                this.refresh();
            }
        });
    }

    addSetting(): void {
        if (this.strategy.settings[this.newRow.key]) {
            this.dialog.open(DuplicateKeyComponent, {
                width: '500px',
                data: this.newRow,
                autoFocus: false
            }).afterClosed().subscribe(result => {
                if (result.event === 'confirm') {
                    this.doAddSetting();
                }
            });
        } else {
            this.doAddSetting();
        }
    }

    private doAddSetting(): void {
        const settings = this.dataSource.data;
        const cloneRow = JSON.parse(JSON.stringify(this.newRow));

        if (this.newRow.key.includes('.')) {
            const keys = this.newRow.key.split('.');
            this.strategy.settings[keys[0]][keys[1]] = this.newRow.value;
            cloneRow.displayKey = keys[1];
        } else {
            this.strategy.settings[this.newRow.key] = this.newRow.value;
            cloneRow.displayKey = this.newRow.key;
        }

        let idx = -1;
        for (let i = 0; i < settings.length; i++) {
            const gs = settings[i];
            if (gs.key == this.newRow.key) {
                idx = i;
                break;
            }
        }
        if (idx > -1) {
            settings[idx] = cloneRow;
        } else {
            settings.push(cloneRow);
        }

        this.newRow.key = '';
        this.newRow.value = '';

        this.dataSource.data = settings;
        this.strategy.isDirty = true;
        this.dataSource.paginator.firstPage();
    }

    deleteSetting(setting: GenericSetting): void {
        this.dialog.open(DeleteSettingComponent, {
            width: '500px',
            data: setting,
            autoFocus: false
        }).afterClosed().subscribe(result => {
            if (result.event === 'confirm') {
                if (setting.key.includes('.')) {
                    const keys = setting.key.split('.');
                    delete this.strategy.settings[keys[0]][keys[1]];
                } else {
                    delete this.strategy.settings[setting.key];
                }
                this.refresh();
            }
        });
    }
}
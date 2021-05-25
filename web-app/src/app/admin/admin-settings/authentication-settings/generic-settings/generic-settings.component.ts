import { OnInit, Component, Input, ViewChild, AfterViewInit } from '@angular/core';
import { GenericSetting } from './generic-settings.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Strategy } from '../../admin-settings.model';
import { MatDialog } from '@angular/material/dialog';
import { DuplicateKeyComponent } from './duplicate-key/duplicate-key.component';
import { EditValueComponent } from './edit-value/edit-value.component';

@Component({
    selector: 'generic-settings',
    templateUrl: 'generic-settings.component.html',
    styleUrls: ['./generic-settings.component.scss']
})
export class GenericSettingsComponent implements OnInit, AfterViewInit {
    @Input() strategy: Strategy;
    @Input() editable: boolean = true;
    dataSource: MatTableDataSource<GenericSetting>;
    readonly displayedColumns: string[] = ['key', 'value', 'action'];
    readonly settingsKeysToIgnore: string[] = ['accountLock', 'devicesReqAdmin', 'usersReqAdmin', 'passwordPolicy', 'newUserTeams', 'newUserEvents'];
    newRow: GenericSetting = {
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

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    refresh() {
        const settings: GenericSetting[] = [];
        for (const [key, value] of Object.entries(this.strategy.settings)) {

            if (this.settingsKeysToIgnore.includes(key)) {
                continue;
            }

            let castedValue: string;

            if (typeof value == 'string') {
                castedValue = value as string;
            } else {
                castedValue = JSON.stringify(value);
            }

            const gs: GenericSetting = {
                key: key,
                value: castedValue,
                required: true
            };
            settings.push(gs);
        }
        this.dataSource.data = settings;
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    editSetting(setting: GenericSetting): void {
        this.dialog.open(EditValueComponent, {
            width: '500px',
            data: setting,
            autoFocus: false
        }).afterClosed().subscribe(result => {
            if (result.event === 'confirm') {
                const updatedSetting = result.data;
                this.strategy.settings[updatedSetting.key] = updatedSetting.value;
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
                if (result === 'confirm') {
                    this.doAddSetting();
                }
            });
        } else {
            this.doAddSetting();
        }
    }

    private doAddSetting(): void {
        const settings = this.dataSource.data;

        let idx = -1;
        for (let i = 0; i < settings.length; i++) {
            const gs = settings[i];
            if (gs.key == this.newRow.key) {
                idx = i;
                break;
            }
        }

        const cloneRow = { key: this.newRow.key, value: this.newRow.value, required: this.newRow.required };
        if (idx > -1) {
            settings[idx] = cloneRow;
        } else {
            settings.push(cloneRow);
        }

        this.strategy.settings[this.newRow.key] = this.newRow.value;
        this.newRow.key = '';
        this.newRow.value = '';

        this.dataSource.data = settings;
        this.strategy.isDirty = true;
        this.dataSource.paginator.firstPage();
    }

    deleteSetting(setting: GenericSetting): void {
        const settings = this.dataSource.data;
        const filtered = settings.filter(function (value, index, arr) {
            return value !== setting;
        });
        this.dataSource.data = filtered;

        delete this.strategy.settings[setting.key];
        this.strategy.isDirty = true;
        this.dataSource.paginator.firstPage();
    }
}
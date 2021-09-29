import { OnInit, Component, Input, ViewChild, AfterViewInit } from '@angular/core';
import { GenericSetting } from './generic-settings.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { Strategy } from '../../admin-settings.model';
import { MatDialog } from '@angular/material/dialog';
import { EditSettingComponent } from './edit-setting/edit-setting.component';
import { SettingsKeyHandler } from './utilities/settings-key-handler';

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
      key: '',
      value: ''
   }
   readonly settingsKeyHandler = new SettingsKeyHandler();

   @ViewChild(MatSort) sort: MatSort;

   constructor(private dialog: MatDialog) {}

   ngOnInit(): void {
      this.dataSource = new MatTableDataSource([])
      this.refresh()
   }

   ngAfterViewInit(): void {
      this.dataSource.sort = this.sort
   }

   refresh(): void {
      this.dataSource.data = this.convertObjectToSettings(this.strategy.settings)
   }

   convertObjectToSettings(obj: any): GenericSetting[] {
      const settings: GenericSetting[] = []
      Object.keys(obj)
         .filter(key => !this.settingsKeysToIgnore.includes(key))
         .forEach(key => {
            settings.push({
               displayKey: key,
               key: key,
               value: obj[key],
               isSecret: false
            })
         })

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
            this.settingsKeyHandler.flattenAndSet(key, updatedSetting.value, this.strategy.settings);
            this.strategy.isDirty = true;
            this.refresh();
         }
      })
   }
}
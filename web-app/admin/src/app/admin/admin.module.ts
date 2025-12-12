import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminPluginTabContentComponent } from './plugin-tab/plugin-tab-content.component';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AdminNavComponent } from './admin-nav/admin-nav';
import { AdminBreadcrumbModule } from './admin-breadcrumb/admin-breadcrumb.module';

@NgModule({
  imports: [CommonModule, FormsModule, AdminUsersModule, AdminBreadcrumbModule],
  declarations: [AdminPluginTabContentComponent, AdminNavComponent],
  exports: [AdminPluginTabContentComponent, AdminUsersModule, AdminNavComponent]
})
export class AdminModule { }

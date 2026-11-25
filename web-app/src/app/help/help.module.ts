import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HelpComponent } from './help.component';
import { GuideEditorComponent } from './guide-editor.component';

const routes: Routes = [{ path: '', component: HelpComponent }];

@NgModule({
  declarations: [HelpComponent, GuideEditorComponent],
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class HelpModule { }

import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatBadgeModule } from '@angular/material/badge'
import { StaticIconModule } from '@ngageoint/mage.web-core-lib/static-icon'
import { FeedIconComponent } from './feed-icon.component'

@NgModule({
  imports: [
    CommonModule,
    MatIconModule,
    MatBadgeModule,
    StaticIconModule
  ],
  declarations: [
    FeedIconComponent
  ],
  exports: [
    FeedIconComponent
  ]
})
export class FeedIconModule {

}

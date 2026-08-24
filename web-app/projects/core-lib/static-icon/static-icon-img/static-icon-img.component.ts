import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { RegisteredStaticIconReference, contentPathOfIcon } from '../static-icon.model'

@Component({
    selector: 'mage-static-icon-img',
    template: `<img *ngIf="iconSrc" [attr.src]="iconSrc" />`,
    standalone: false
})
export class StaticIconImgComponent implements OnChanges {

  @Input()
  iconRef: RegisteredStaticIconReference | string | null = null

  @Input()
  accessToken: string | null = null

  iconSrc: string | null = null

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.iconRef || changes.accessToken) {
      const path = contentPathOfIcon(this.iconRef) ?? null
      this.iconSrc = path && this.accessToken
        ? `${path}?access_token=${encodeURIComponent(this.accessToken)}`
        : path
    }
  }
}

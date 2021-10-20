import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { RegisteredStaticIconReference, contentPathOfIcon } from '../static-icon.model'

@Component({
  selector: 'mage-static-icon-img',
  template: `<mage-xhr-img [src]="iconPath"></mage-xhr-img>`,
})
export class StaticIconImgComponent implements OnInit, OnChanges {

  @Input()
  iconRef: RegisteredStaticIconReference | string | null
  iconPath: string | null

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.iconRef) {
      if (this.iconRef) {
        this.iconPath = contentPathOfIcon(this.iconRef)
      }
      else {
        this.iconPath = null
      }
    }
  }
}

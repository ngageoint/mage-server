
import { Component, Input, NgModuleRef, OnChanges, OnInit, SimpleChanges, TemplateRef, Type, ViewChild, ViewContainerRef } from '@angular/core'

@Component({
  selector: 'mage-admin-plugin-tab-content',
  template: `<ng-template></ng-template>`
})
export class AdminPluginTabContentComponent implements OnInit, OnChanges {

  @Input()
  pluginTab: AdminPluginTab

  @ViewChild(TemplateRef, { read: ViewContainerRef, static: true })
  pluginView: ViewContainerRef

  ngOnInit() {

  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.pluginTab) {
      this.pluginView.clear()
      if (this.pluginTab) {
        this.pluginView.clear()
        const componentFactory = this.pluginTab.module.componentFactoryResolver.resolveComponentFactory(this.pluginTab.tabContentComponent)
        this.pluginView.createComponent(componentFactory)
      }
    }
  }
}

export interface AdminPluginTab {
  module: NgModuleRef<unknown>
  tabContentComponent: Type<unknown>
}

import { Type } from '@angular/core'

export interface PluginHooks {
  module: Type<unknown>
  adminTab?: {
    title: string
    icon?: { path: string } | { matIconName: string } | null | undefined
    tabContentComponent: Type<unknown>
  }
}
import { Type } from '@angular/core'

export interface PluginHooks {
  module: Type<unknown>
  adminTab?: {
    title: string
    icon?: { path: string } | { className: string } | null | undefined
    tabContentComponent: Type<unknown>
  }
}
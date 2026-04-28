import { Injectable } from '@angular/core';

import { CanComponentDeactivate } from './guard/can-component-deactivate';

@Injectable({ providedIn: 'root' })
export class AdminUnsavedChangesGuard  {
  canDeactivate(component: CanComponentDeactivate) {
    return component.onUnsavedChanges();
  }
}

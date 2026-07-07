import { Observable } from 'rxjs';

export interface CanComponentDeactivate {
  onUnsavedChanges: () => boolean | Observable<boolean> | Promise<boolean>;
}

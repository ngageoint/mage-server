import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
  inject,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatButtonModule } from '@angular/material/button'
import { Subject } from 'rxjs'
import { debounceTime } from 'rxjs/operators'
import { JsonSchemaFormWithServiceComponent } from '../../../../json-schema/json-schema.component'

@Component({
    selector: 'app-topic-configuration',
    templateUrl: './admin-feed-edit-topic-configuration.component.html',
    styleUrls: ['./admin-feed-edit-topic-configuration.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [MatExpansionModule, MatButtonModule, JsonSchemaFormWithServiceComponent]
})
export class AdminFeedEditTopicConfigurationComponent {
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  @Input() fetchParametersSchema: any
  @Input() initialFetchParameters: any
  @Input() expanded: boolean
  @Input() showPrevious: boolean
  @Output() fetchParametersChanged = new EventEmitter<any>()
  @Output() fetchParametersAccepted = new EventEmitter<any>()
  @Output() cancelled = new EventEmitter()
  @Output() opened = new EventEmitter()

  readonly changeDebounceInterval = 500

  private fetchParametersMod: any = {}
  private debounceChange = new Subject<any>()

  formOptions = {
    addSubmit: false
  }

  constructor() {
    this.debounceChange.pipe(
      debounceTime(this.changeDebounceInterval),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(x => { this.fetchParametersChanged.emit(x) })
  }

  onFetchParametersChanged($event: any): void {
    this.fetchParametersMod = $event
    this.debounceChange.next(this.fetchParametersMod)
  }

  finish(): void {
    this.fetchParametersAccepted.emit(this.fetchParametersMod)
  }

  cancel(): void {
    this.cancelled.emit()
  }
}

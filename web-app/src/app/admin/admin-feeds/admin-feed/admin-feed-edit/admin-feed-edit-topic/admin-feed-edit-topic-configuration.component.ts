import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core'
import { Subject } from 'rxjs'
import { debounceTime } from 'rxjs/operators'

@Component({
  selector: 'app-topic-configuration',
  templateUrl: './admin-feed-edit-topic-configuration.component.html',
  styleUrls: ['./admin-feed-edit-topic-configuration.component.scss']
})
export class AdminFeedEditTopicConfigurationComponent implements OnChanges, OnInit {

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
      debounceTime(this.changeDebounceInterval)
    ).subscribe(x => { this.fetchParametersChanged.emit(x) })
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
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

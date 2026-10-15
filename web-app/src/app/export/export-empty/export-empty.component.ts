import { Component, EventEmitter, Output } from "@angular/core"

@Component({
    selector: 'export-empty',
    templateUrl: 'export-empty.component.html',
    styleUrls: ['./export-empty.component.scss'],
    standalone: false
})
export class ExportEmptyComponent {

  @Output() open = new EventEmitter<void>()

  openExport(): void {
    this.open.emit()
  }
}

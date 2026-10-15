import { Component, EventEmitter, Inject, OnDestroy, OnInit, Output } from '@angular/core';
import { ExportService } from '../export.service';
import { Subscription } from 'rxjs';
import { SidebarService } from 'src/app/sidebar/sidebar.service';
import { Export, ExportStatus } from '../entities.export';

@Component({
  selector: 'export-list',
  templateUrl: 'export-list.component.html',
  styleUrls: ['./export-list.component.scss'],
  standalone: false
})
export class ExportListComponent implements OnInit, OnDestroy {
  @Output() create = new EventEmitter<void>()

  exportStatus = ExportStatus
  exports: Export[] = []
  exportsSubscription: Subscription

  constructor(
    @Inject(ExportService) public exportService: ExportService,
    private sidebarService: SidebarService,
  ) { }

  ngOnInit(): void {
    this.exportsSubscription = this.exportService.exports$.subscribe({
      next: (exports => {
        this.exports = exports
      })
    })
  }

  ngOnDestroy(): void {
    this.exportsSubscription?.unsubscribe()
  }

  trackExport(_index: number, exp: Export) {
    return exp.id
  }

  onCreate(): void {
    this.create.emit()
  }

  onClick(e: Export): void {
    this.sidebarService.viewExport(e)
  }
}

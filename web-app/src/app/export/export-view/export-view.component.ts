import { Component, EventEmitter, Inject, Input, OnInit, OnDestroy, AfterViewInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { ExportService } from '../export.service';
import { MatDialog } from '@angular/material/dialog';
import moment from 'moment';
import { EventService } from 'src/app/event/event.service';
import { SidebarService } from 'src/app/sidebar/sidebar.service';
import { SessionService } from '../../http/session.service';
import { Subscription } from 'rxjs';
import { Export, ExportStatus, FormProjection } from '../entities.export';

@Component({
  selector: 'export-view',
  templateUrl: 'export-view.component.html',
  styleUrls: ['./export-view.component.scss'],
  standalone: false
})
export class ExportViewComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() item: Export
  @Output() close = new EventEmitter<void>()

  @ViewChild('deleteDialog') deleteDialog: TemplateRef<any>

  exportsSubscription: Subscription

  exportStatus = ExportStatus
  token: string
  summaryStart: number
  summaryEnd: number

  formProjections: FormProjection[] = []

  disableAnimation = true;

  constructor(
    private dialog: MatDialog,
    @Inject(ExportService) public exportService: ExportService,
    private eventService: EventService,
    private sidebarService: SidebarService,
    sessionService: SessionService
  ) {
    this.token = sessionService.getToken()
    this.formProjections = []
  }

  ngOnInit(): void {
    const observationStart = moment(this.item.summary?.observations?.startTimestamp || null)
    const observationEnd = moment(this.item.summary?.observations?.endTimestamp || null)
    const locationStart = moment(this.item.summary?.locations?.startTimestamp || null)
    const locationEnd = moment(this.item.summary?.locations?.endTimeStamp || null)

    this.summaryStart = this.compare(
      observationStart.isValid() ? observationStart.valueOf() : null,
      locationStart.isValid() ? locationStart.valueOf() : null,
      Math.min
    )

    this.summaryEnd = this.compare(
      observationEnd.isValid() ? observationEnd.valueOf() : null,
      locationEnd.isValid() ? locationEnd.valueOf() : null,
      Math.max
    )

    const event = this.eventService.getEventById(this.item.options.event?.id)
    const forms = event?.forms || []
    this.formProjections = forms
      .filter(form => !form.archived)
      .map(form => {
        const fieldProjections = form.fields
          .filter(field => !field.archived)
          .filter(field => field.type !== 'attachment')
          .sort((a: { id: number }, b: { id: number }) => a.id - b.id)
          .map(field => {
            let selected = true
            const projection = this.item.options.projection
            if (projection) {
              const projectedForm = projection.find(projection => projection.formId === form.id)
              selected = projectedForm !== undefined && projectedForm.fields.some(projectedField => projectedField === field.name)
            }

            return {
              field,
              selected
            }
          })

        return {
          form,
          selected: fieldProjections.every(field => field.selected),
          selectedCount: fieldProjections.filter(field => field.selected).length,
          fieldProjections
        }
      })

    this.exportsSubscription = this.exportService.exports$.subscribe({
      next: (exports => {
        const item = exports.find(e => e.id === this.item.id)
        if (item) {
          this.item = item
        }
      })
    })
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.disableAnimation = false)
  }

  ngOnDestroy(): void {
    this.exportsSubscription?.unsubscribe()
  }

  deleteExport(e: Export): void {
    this.dialog.open(this.deleteDialog).afterClosed().subscribe(result => {
      if (result === 'delete') {
        this.exportService.deleteExport(e.id).subscribe(() => {
          this.sidebarService.viewExport(null)
        })
      }
    })
  }

  onClose(): void {
    this.close.emit()
  }

  allFieldsSelected(formProjection: FormProjection): boolean {
    if (formProjection.fieldProjections.length === 0) {
      return false
    }

    return formProjection.fieldProjections.every(field => field.selected)
  }

  someFieldsSelected(formProjection: FormProjection): boolean {
    if (formProjection.fieldProjections.length === 0) {
      return false
    }

    const allSelected = this.allFieldsSelected(formProjection)
    const someSelected = formProjection.fieldProjections.some(field => field.selected)
    return !allSelected && someSelected
  }

  noFieldsSelected(formProjection: FormProjection): boolean {
    if (formProjection.fieldProjections.length === 0) {
      return true
    }

    return !formProjection.fieldProjections.some(field => field.selected)
  }

  compare(timestamp1: number | null, timestamp2: number | null, operator: (t1: number, t2: number) => number): number | null {
    if (timestamp1 == null && timestamp2 == null) return null
    if (timestamp1 == null) return timestamp2
    if (timestamp2 == null) return timestamp1

    return operator(timestamp1, timestamp2)
  }
}

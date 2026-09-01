import { Component, EventEmitter, Inject, Input, OnInit, AfterViewInit, Output, TemplateRef, ViewChild, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ExportService } from '../export.service';
import { MatDialog } from '@angular/material/dialog';
import moment from 'moment';
import { EventService } from 'src/app/event/event.service';
import { SidebarService } from 'src/app/sidebar/sidebar.service';
import { SessionService } from '../../http/session.service';
import { LocalStorageService } from '../../http/local-storage.service';
import { Export, ExportStatus, FormProjection } from '../entities.export';
import { Condition } from '../../entities/observation/filter/entities.observation.filter';
import { Team } from '../../entities/team/entities.team';
import { Form } from '../../entities/event/entities.event';

type ConditionTerm = { field: string, operator: string, value?: string }

@Component({
  selector: 'export-view',
  templateUrl: 'export-view.component.html',
  styleUrls: ['./export-view.component.scss'],
  standalone: false
})
export class ExportViewComponent implements OnInit, AfterViewInit {
  @Input() item: Export
  @Output() close = new EventEmitter<void>()

  @ViewChild('deleteDialog') deleteDialog: TemplateRef<void>

  private destroyRef = inject(DestroyRef)

  exportStatus = ExportStatus
  token: string | null
  summaryStart: number | null = null
  summaryEnd: number | null = null

  formProjections: FormProjection[] = []
  memberFilterLabels: { type: 'team' | 'user', name: string }[] = []

  private eventForms: Form[] = []

  disableAnimation = true;

  constructor(
    private dialog: MatDialog,
    @Inject(ExportService) public exportService: ExportService,
    private eventService: EventService,
    private sidebarService: SidebarService,
    private localStorageService: LocalStorageService,
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
    const forms: Form[] = event?.forms || []
    this.eventForms = forms

    const teamIds: string[] = [...new Set([
      ...(this.item.options?.filter?.observations?.teamIsAnyOf || []),
      ...(this.item.options?.filter?.locations?.teamIsAnyOf || [])
    ])]
    const userIds: string[] = [...new Set([
      ...(this.item.options?.filter?.observations?.userIsAnyOf || []),
      ...(this.item.options?.filter?.locations?.userIsAnyOf || [])
    ])]
    if (teamIds.length || userIds.length) {
      const teams: Team[] = event?.teams || []
      const teamLabels = teams
        .filter(team => teamIds.includes(String(team.id)))
        .map(team => ({ type: 'team' as const, name: team.name }))

      if (userIds.length) {
        this.eventService.getMembers(event).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(users => {
          const userLabels = users
            .filter(user => userIds.includes(user.id))
            .map(user => ({ type: 'user' as const, name: user.displayName || user.username }))
          this.memberFilterLabels = [...teamLabels, ...userLabels]
        })
      } else {
        this.memberFilterLabels = teamLabels
      }
    }

    this.formProjections = forms
      .filter(form => !form.archived)
      .map(form => {
        const fieldProjections = form.fields
          .filter(field => !field.archived)
          .filter(field => field.type !== 'attachment')
          .sort((a, b) => a.id - b.id)
          .map(field => {
            let selected = true
            const projection = this.item.options?.filter?.observations?.projection
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

    this.exportService.exports$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  formatSummaryDate(timestamp: number): string {
    if (this.localStorageService.getTimeZoneView() === 'gmt') {
      return moment(timestamp).utc().format('MMM D YYYY h:mm A z')
    }
    return moment(timestamp).format('MMM D YYYY h:mm A')
  }

  compare(timestamp1: number | null, timestamp2: number | null, operator: (t1: number, t2: number) => number): number | null {
    if (timestamp1 == null && timestamp2 == null) return null
    if (timestamp1 == null) return timestamp2
    if (timestamp2 == null) return timestamp1

    return operator(timestamp1, timestamp2)
  }

  get hasObservationFilter(): boolean {
    return this.keywordFilter !== null || this.conditionGroups.length > 0
  }

  get keywordFilter(): string | null {
    const keyword = this.item.options?.filter?.observations?.fieldFilter?.keyword
    return keyword?.length ? keyword : null
  }

  get conditionGroups(): ConditionTerm[][] {
    const condition = this.item.options?.filter?.observations?.fieldFilter?.condition
    if (!condition) return []
    return this.parseConditionGroups(condition)
  }

  private parseConditionGroups(condition: Condition): ConditionTerm[][] {
    if ('and' in condition) {
      return condition.and.map(c => this.parseOrGroup(c)).filter(g => g.length > 0)
    }
    const group = this.parseOrGroup(condition)
    return group.length > 0 ? [group] : []
  }

  private parseOrGroup(condition: Condition): ConditionTerm[] {
    if ('or' in condition) {
      return condition.or.map(c => this.formatSimpleCondition(c)).filter((t): t is ConditionTerm => t !== null)
    }
    const term = this.formatSimpleCondition(condition)
    return term ? [term] : []
  }

  private formatSimpleCondition(condition: Condition): ConditionTerm | null {
    if ('and' in condition || 'or' in condition) return null

    const field = this.eventForms
      .find(form => form.id === condition.formId)?.fields
      .find(field => field.name === condition.field)

    if (!field) return null

    const operator = this.operatorDisplay(condition.operator)
    if (!('value' in condition)) {
      return { field: field.title, operator }
    }
    return { field: field.title, operator, value: String(condition.value) }
  }

  private operatorDisplay(operator: string): string {
    const displayMap: Record<string, string> = {
      '=': 'is', '!=': 'is not', 'LIKE': 'contains',
      'IS NULL': 'is empty', 'IS NOT NULL': 'is not empty',
      '>': '>', '>=': '>=', '<': '<', '<=': '<=',
      'IN': 'is one of', 'NOT IN': 'is not one of', 'BETWEEN': 'is between',
    }
    return displayMap[operator] || operator
  }
}

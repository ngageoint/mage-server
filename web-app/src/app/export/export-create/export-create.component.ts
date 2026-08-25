import { Component, OnInit, Inject, EventEmitter, Output } from '@angular/core';
import { ExportService } from '../export.service';
import moment from 'moment';
import { FilterService } from 'src/app/filter/filter.service';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Export, ExportFormat, ExportFormProjection, ExportRequest, ExportTimeOption, FormProjection } from '../entities.export';
import { map, Observable, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';
import { EventService } from 'src/app/event/event.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

type ExportFormatOption = {
  text: string
  value: ExportFormat
}

@Component({
  selector: 'export-create',
  templateUrl: 'export-create.component.html',
  styleUrls: ['./export-create.component.scss'],
  standalone: false
})
export class ExportCreateComponent implements OnInit {
  @Output() close = new EventEmitter<Export | null>()

  events: any[]
  exportEvent: any
  eventControl = new FormControl()

  filteredEvents: Observable<any[]>
  exportObservations = true;
  exportLocations = true;
  exportFavorites: boolean;
  exportImportant: boolean;
  includeAttachments: boolean = true;

  exportFormats: ExportFormatOption[] = [{
    text: 'CSV',
    value: ExportFormat.CSV
  }, {
    text: 'KML',
    value: ExportFormat.KML
  }, {
    text: 'GeoPackage',
    value: ExportFormat.GEOPACKAGE
  }, {
    text: 'GeoJSON',
    value: ExportFormat.GEOJSON
  }]

  exportTimeOptions: ExportTimeOption[] = [{
    value: 300,
    label: 'Last 5 minutes',
    key: 'five'
  }, {
    value: 3600,
    label: 'Last Hour',
    key: 'hour'
  }, {
    value: 43200,
    label: 'Last 12 Hours',
    key: 'twelve'
  }, {
    value: 86400,
    label: 'Last 24 Hours',
    key: 'twentyfour'
  }, {
    all: true,
    value: null,
    label: 'All  (Use With Caution)',
    key: 'all'
  }, {
    custom: true,
    value: null,
    label: 'Custom (Choose your own start/end)',
    key: 'custom'
  }];

  exportTime = 'twentyfour';
  exportFormat: ExportFormat = this.exportFormats[0].value;
  defaultStartDate: Date
  defaultEndDate: Date
  startDate: Date
  endDate: Date

  formProjections: FormProjection[]
  allComplete: boolean = false;

  constructor(
    private eventService: EventService,
    private filterService: FilterService,
    @Inject(ExportService) public exportService: ExportService,
  ) {
    this.defaultStartDate = moment().startOf('day').toDate()
    this.defaultEndDate = moment().endOf('day').toDate()
  }

  ngOnInit(): void {
    const event = this.filterService.getEvent()
    this.eventControl.setValue(event)
    this.setEvent(event)

    this.eventService.query().subscribe((events: any) => {
      this.events = events
      this.filteredEvents = this.eventControl.valueChanges.pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : value.name),
        map(name => name ? this.filterEvent(name) : this.events.slice())
      )
    })
  }

  onStartDate(date: Date): void {
    this.startDate = date;
  }

  onEndDate(date: Date): void {
    this.endDate = date;
  }

  exportData(): void {
    let exportTimeOption: ExportTimeOption;
    for (let i = 0; i < this.exportTimeOptions.length; i++) {
      exportTimeOption = this.exportTimeOptions[i];
      if (exportTimeOption.key === this.exportTime) {
        break;
      }
    }

    let start: string;
    let end: string;
    if (exportTimeOption.custom) {
      start = moment(this.startDate).toISOString();
      end = moment(this.endDate).toISOString();
    } else if (exportTimeOption.value) {
      start = moment().subtract(exportTimeOption.value, 'seconds').toISOString();
    }

    const exportRequest: ExportRequest = {
      format: this.exportFormat,
      observations: this.exportObservations,
      locations: this.exportLocations
    };

    if (start) exportRequest.startDate = start;
    if (end) exportRequest.endDate = end;

    if (this.exportObservations) {
      exportRequest.includeAttachments = this.includeAttachments
      exportRequest.favorites = this.exportFavorites
      exportRequest.important = this.exportImportant
    }

    let projection: ExportFormProjection[]
    const projectAllFields = this.formProjections.every(form => form.selected && form.fieldProjections.every(field => field.selected))
    if (!projectAllFields) {
      projection = this.formProjections
        .filter(formProjection => {
          return formProjection.fieldProjections.some(fieldProjection => fieldProjection.selected)
        })
        .map(formProjection => {
          const fields = formProjection.fieldProjections
            .filter(fieldProjection => fieldProjection.selected)
            .map(fieldProjection => fieldProjection.field.name)

          return {
            formId: formProjection.form.id,
            fields
          }
        })
    }
    if (projection) {
      exportRequest.projection = projection
    }

    this.exportService.export(this.eventControl.value.id, exportRequest).subscribe((response: Export) => {
      this.close.emit(response)
    });
  }

  cancel(): void {
    this.close.emit()
  }

  onEventSelected(event: MatAutocompleteSelectedEvent): void {
    this.setEvent(event.option.value)
  }

  private setEvent(event: any) {
    const forms = event.forms || []
    this.formProjections = forms
      .filter(form => !form.archived)
      .map(form => {
        return {
          form,
          selected: true,
          fieldProjections: form.fields
            .filter(field => !field.archived)
            .filter(field => field.type !== 'attachment')
            .sort((a: { id: number }, b: { id: number }) => a.id - b.id)
            .map(field => {
              return {
                field,
                selected: true
              }
            })
        }
      })
  }

  onDisplayEvent(event: any): string {
    return event && event.name ? event.name : '';
  }

  private filterEvent(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.events.filter(option => option.name.toLowerCase().indexOf(filterValue) === 0);
  }

  exportObservationsChanged($event: MatCheckboxChange): void {
    if (!$event.checked) {
      this.includeAttachments = false
    }
  }

  fieldSelected(formProjection: FormProjection): void {
    formProjection.selectedCount = formProjection.fieldProjections.filter(fieldProjection => fieldProjection.selected).length
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

  selectedAllFields(formProjection: FormProjection, selected: boolean) {
    formProjection.fieldProjections.forEach(field => (field.selected = selected))
  }
}

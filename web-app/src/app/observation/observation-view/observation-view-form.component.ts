import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'observation-view-form',
  templateUrl: './observation-view-form.component.html',
  styleUrls: ['./observation-view-form.component.scss'],
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('300ms', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms', style({ height: 0, opacity: 0 }))
      ])
    ]),
    trigger('rotate', [
      state('true', style({ transform: 'rotate(180deg)' })),
      state('false', style({ transform: 'rotate(0)' })),
      transition('* <=> *', animate('300ms ease-out'))
    ])
  ]
})
export class ObservationViewFormComponent implements OnInit, OnChanges {
  @Input() form: any
  @Input() attachments: any[]
  @Input() expand: boolean

  primaryField: any = {}
  secondaryField: any = {}

  ngOnInit(): void {
    this.updateView()
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateView()
  }

  nonArchivedFields(fields: any[]): any[] {
    return fields
      .filter(field => !field.archived)
      .sort((a: { id: number }, b: { id: number }) => a.id - b.id);
  }

  hasContent(): boolean {
    const fields: any[] = this.form.fields
    return fields
      .filter(field => !field.archived)
      .some(field => {
        if (field.type === 'attachment') {
          return this.attachments.filter(attachment => attachment.observationFormId === this.form.remoteId).length
        } else {
          return field.value
        }
      })
  }

  private updateView(): void {
    if (this.form.primaryFeedField) {
      this.primaryField = this.form.fields.find(field => field.name === this.form.primaryFeedField)
    }

    if (this.form.secondaryFeedField) {
      this.secondaryField = this.form.fields.find(field => field.name === this.form.secondaryFeedField)
    }
  }
}

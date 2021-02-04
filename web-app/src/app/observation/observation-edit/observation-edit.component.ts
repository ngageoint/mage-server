import { animate, style, transition, trigger } from '@angular/animations'
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop'
import { DOCUMENT } from '@angular/common'
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Inject, Input, OnChanges, OnInit, Output, QueryList, SimpleChanges, ViewChild, ViewChildren } from '@angular/core'
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'
import { MatBottomSheet, MatDialog, MatIconRegistry, MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material'
import { DomSanitizer } from '@angular/platform-browser'
import { first } from 'rxjs/operators'
import { EventService, FilterService, LocalStorageService, MapService, ObservationService, UserService } from 'src/app/upgrade/ajs-upgraded-providers'
import { ObservationEditFormPickerComponent } from './observation-edit-form-picker.component'
import * as moment from 'moment';

export type ObservationFormControl = FormControl & { definition: any }

@Component({
  selector: 'observation-edit',
  templateUrl: './observation-edit.component.html',
  styleUrls: ['./observation-edit.component.scss'],
  animations: [
    trigger('error', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('250ms', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('250ms', style({ height: 0, opacity: 0 }))
      ])
    ]),
    trigger('mask', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('250ms', style({ opacity: .2 })),
      ]),
      transition(':leave', [
        animate('250ms', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class ObservationEditComponent implements OnInit, OnChanges {
  @Input() preview: boolean
  @Input() observation: any

  @Output() close = new EventEmitter<any>()

  @ViewChild('editContent', { static: true }) editContent: ElementRef
  @ViewChild('dragHandle', { static: true }) dragHandle: ElementRef
  @ViewChildren('form') formElements: QueryList<ElementRef>;

  event: any
  formGroup: FormGroup
  formDefinitions: any
  timestampDefinition = {
    title: '',
    type: 'date',
    name: 'timestamp',
    required: true
  }
  geometryDefinition = {
    title: 'Location',
    type: 'geometry',
    name: 'geometry',
    required: true
  }

  mask = false
  saving = false
  error: any
  uploadId = 0
  uploadAttachments = false
  attachments = []

  isNewObservation: boolean
  canDeleteObservation: boolean
  observationForm = {}
  formOptions = { expand: false }

  initialObservation: any
  geometryStyle: any

  primaryField: any
  primaryFieldValue: string
  secondaryField: any
  secondaryFieldValue: string

  formRemoveSnackbar: MatSnackBarRef<SimpleSnackBar>

  constructor(
    sanitizer: DomSanitizer,
    matIconRegistry: MatIconRegistry,
    public dialog: MatDialog,
    private formBuilder: FormBuilder,
    private bottomSheet: MatBottomSheet,
    private snackBar: MatSnackBar,
    private changeDetector: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document,
    @Inject(MapService) private mapService: any,
    @Inject(UserService) private userService: any,
    @Inject(FilterService) private filterService: any,
    @Inject(EventService) private eventService: any,
    @Inject(ObservationService) private observationService: any,
    @Inject(LocalStorageService) private localStorageService: any) {

    matIconRegistry.addSvgIcon('handle', sanitizer.bypassSecurityTrustResourceUrl('assets/images/handle-24px.svg'));
  }

  ngOnInit(): void {
    if (this.observation.id === 'new') {
      this.formOptions.expand = true
    }

    this.canDeleteObservation = this.observation.id !== 'new' &&
      (this.hasEventUpdatePermission() || this.isCurrentUsersObservation() || this.hasUpdatePermissionsInEventAcl())
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.observation  && changes.observation.currentValue) {
      this.event = this.eventService.getEventById(this.observation.eventId)
      this.formDefinitions = this.eventService.getFormsForEvent(this.event).reduce((map, form) => {
        map[form.id] = form
        return map
      }, {})

      this.isNewObservation = this.observation.id === 'new'
      this.initialObservation = JSON.parse(JSON.stringify(this.observation))

      if (this.observation.style) {
        this.geometryStyle = JSON.parse(JSON.stringify(this.observation.style))
      }

      if (this.isNewObservation) {
        this.mapService.addFeaturesToLayer([this.observation], 'Observations')
      }

      this.toFormGroup(this.observation)
      this.updatePrimarySecondary()
    }
  }

  hasEventUpdatePermission(): boolean {
    return this.userService.myself.role.permissions.includes('DELETE_OBSERVAION')
  }

  isCurrentUsersObservation(): boolean {
    return this.observation.userId === this.userService.myself.id
  }

  hasUpdatePermissionsInEventAcl(): boolean {
    const myAccess = this.filterService.getEvent().acl[this.userService.myself.id]
    const aclPermissions = myAccess ? myAccess.permissions : []
    return aclPermissions.includes('update')
  }

  token(): string {
    return this.localStorageService.getToken()
  }

  // TODO multi-form build out validators here as well for each form control
  toFormGroup(observation: any): void {
    const timestampControl = new FormControl(moment(observation.properties.timestamp).toDate(), Validators.required);
    const geometryControl = new FormControl(observation.geometry, Validators.required);

    const formArray = new FormArray([])
    const observationForms = observation.properties.forms || []
    observationForms.forEach(observationForm => {
      const formDefinition = this.formDefinitions[observationForm.formId]
      const fieldGroup = new FormGroup({
        formId: new FormControl(formDefinition.id)
      })

      formDefinition.fields
        .filter(field => !field.archived)
        .sort((a, b) => a.id - b.id)
        .forEach(field => {
          const value = this.isNewObservation ? field.value : observationForm[field.name]
          const fieldControl = new FormControl(value, field.required ? Validators.required : null)
          fieldGroup.addControl(field.name, fieldControl)
        })

      formArray.push(fieldGroup)
    })

    this.formGroup = this.formBuilder.group({
      id: observation.id,
      eventId: new FormControl(observation.eventId),
      type: new FormControl(observation.type),
      geometry: geometryControl,
      properties: new FormGroup({
        timestamp: timestampControl,
        forms: formArray
      })
    })
  }

  updatePrimarySecondary(): void {
    const forms = this.formGroup.get('properties').get('forms') as FormArray
    if (forms.length) {
      const primaryFormGroup = forms.at(0) as FormGroup
      const definition = this.formDefinitions[primaryFormGroup.get('formId').value]

      if (primaryFormGroup.contains(definition.primaryFeedField)) {
        this.primaryField = definition.fields.find(field => field.name === definition.primaryFeedField)
        this.primaryField.value = primaryFormGroup.get(definition.primaryFeedField).value
      }

      if (primaryFormGroup.contains(definition.secondaryFeedField)) {
        this.secondaryField = definition.fields.find(field => field.name === definition.secondaryFeedField)
        this.secondaryField.value = primaryFormGroup.get(definition.secondaryFeedField).value
      }

      if (this.primaryField.value !== this.primaryFieldValue || this.secondaryField.value !== this.secondaryFieldValue) {
        this.primaryFieldValue = this.primaryField ? this.primaryField.value : null
        this.secondaryFieldValue = this.secondaryField ? this.secondaryField.value : null

        const observation = this.formGroup.value

        const style = this.observationService.getObservationStyleForForm(observation, this.event, definition)
        observation.style = style
        this.geometryStyle = style

        this.mapService.updateFeatureForLayer(observation, 'Observations')
      }
    }
  }

  save(): void {
    if (this.formRemoveSnackbar) {
      this.formRemoveSnackbar.dismiss()
    }

    this.saving = true
    const markedForDelete = this.observation.attachments ? this.observation.attachments.filter(attachment => attachment.markedForDelete) : []

    // TODO look at this: this is a hack that will be corrected when we pull ids from the server
    const form = this.formGroup.getRawValue()
    const id = form.id;
    if (form.id === 'new') {
      delete form.id;
    }

    this.eventService.saveObservation(form).then(observation => {
      // If this feature was added to the map as a new observation, remove it
      // as the event service will add it back to the map based on it new id
      // if it passes the current filter.
      if (id === 'new') {
        this.mapService.removeFeatureFromLayer({ id: id }, 'Observations')
      }

      this.error = null;

      if (this.attachments.length) {
        this.uploadAttachments = true;
      } else {
        this.attachments = []
      }

      // delete any attachments that were marked for delete
      markedForDelete.forEach(attachment => {
        this.eventService.deleteAttachmentForObservation(this.observation, attachment);
        observation.attachments = observation.attachments.filter(a => a.id !== attachment.id)
      });

      if (!this.uploadAttachments) {
        this.saving = false
        this.close.emit(observation)
      }
    }, err => {
      this.formGroup.markAllAsTouched()

      if (id === 'new') {
        this.observation.id = 'new'
      }

      this.saving = false;
      this.error = {
        message: err.data
      }
    })
  }

  cancel(): void {
    this.observation.geometry = this.initialObservation.geometry;
    if (this.observation.id !== 'new') {
      this.mapService.updateFeatureForLayer(this.observation, 'Observations')
    } else {
      this.mapService.removeFeatureFromLayer(this.observation, 'Observations')
    }

    const attachments = this.observation.attachments || []
    attachments.forEach(attachment => {
      delete attachment.markedForDelete;
    })

    if (this.formRemoveSnackbar) {
      this.formRemoveSnackbar.dismiss()
    }

    this.close.emit()
  }

  trackByAttachment(index: number, attachment: any): any {
    return attachment.id;
  }

  allAttachments(): any[] {
    const attachments = this.observation.attachments || [];
    return attachments.concat(this.attachments)
  }

  onAttachmentFile(event): void {
    const files = Array.from(event.target.files)
    files.forEach(file => {
      const id = this.uploadId++;
      this.attachments.push({
        id: id,
        file: file
      })
    })

    this.changeDetector.detectChanges()
  }

  onAttachmentRemove($event): void {
    this.attachments = this.attachments.filter(attachment => attachment.id !== $event.id)
  }

  onAttachmentUploaded($event): void {
    this.eventService.addAttachmentToObservation(this.observation, $event.response);

    this.attachments = this.attachments.filter(attachment => attachment.id !== $event.id)
    if (this.attachments.length === 0) {
      this.saving = false;
      this.uploadAttachments = false;
      this.close.emit();
    }
  }

  onAttachmentError($event): void {
    // TODO warn user in some way that attachment didn't upload
    this.attachments = this.attachments.filter(attachment => attachment.id !== $event.id)

    if (this.attachments.length === 0) {
      this.saving = false;
      this.uploadAttachments = false;
      this.close.emit();
    }
  }

  onGeometryEdit(event): void {
    this.mask = event.action === 'edit';

    if (this.mask) {
      const elementBounds = event.source.nativeElement.getBoundingClientRect();
      const parentBounds = this.editContent.nativeElement.getBoundingClientRect();
      if (elementBounds.top < parentBounds.top || elementBounds.bottom > parentBounds.bottom) {
        event.source.nativeElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  pickForm(): void {
    this.formOptions.expand = true
    this.bottomSheet.open(ObservationEditFormPickerComponent, {
      panelClass: 'feed-panel'
    }).afterDismissed().subscribe(form => {
      const fieldsGroup = new FormGroup({
        formId: new FormControl(form.id)
      });

      form.fields
        .filter(field => !field.archived)
        .sort((a, b) => a.id - b.id)
        .forEach(field => {
          const fieldControl = new FormControl(field.value, field.required ? Validators.required : null)
          fieldsGroup.addControl(field.name, fieldControl)
        });

      (this.formGroup.get('properties').get('forms') as FormArray).push(fieldsGroup);

      this.formElements.changes.pipe(first()).subscribe((queryList: QueryList<ElementRef>) => {
        queryList.last.nativeElement.scrollIntoView({ behavior: 'smooth' })
      })
    })
  }

  removeForm(formGroup: FormGroup): void {
    const formArray = this.formGroup.get('properties').get('forms') as FormArray
    const index = formArray.controls.indexOf(formGroup)
    formArray.removeAt(index)

    this.formRemoveSnackbar = this.snackBar.open('Form Removed', 'UNDO', {
      duration: 5000,
      panelClass: 'form-remove-snackbar',
    })
    
    this.formRemoveSnackbar.onAction().subscribe(() => {
      formArray.insert(index, formGroup)
    })
  }

  reorderForm(event: CdkDragDrop<any, any>): void {
    if (event.currentIndex === event.previousIndex) return

    const forms = (this.formGroup.get('properties').get('forms') as FormArray).controls
    moveItemInArray(forms, event.previousIndex, event.currentIndex)

    // re-calculate primary/secondary based new first form
    if (event.currentIndex === 0 || event.previousIndex === 0) {
      this.updatePrimarySecondary()
    }
  }

  dragStart(event: DragEvent): void {
    this.document.body.classList.add('item-drag')
  }

  dragEnd(event: DragEvent): void {
    this.document.body.classList.remove('item-drag')
  }
}

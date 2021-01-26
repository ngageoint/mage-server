import { animate, style, transition, trigger } from '@angular/animations'
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop'
import { DOCUMENT } from '@angular/common'
import { ChangeDetectorRef, Component, DoCheck, ElementRef, EventEmitter, Inject, Input, OnChanges, OnInit, Output, QueryList, SimpleChanges, ViewChild, ViewChildren } from '@angular/core'
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms'
import { MatBottomSheet, MatDialog, MatIconRegistry, MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material'
import { DomSanitizer } from '@angular/platform-browser'
import { first } from 'rxjs/operators'
import { EventService, FilterService, LocalStorageService, MapService, ObservationService, UserService } from 'src/app/upgrade/ajs-upgraded-providers'
import { ObservationEditFormPickerComponent } from './observation-edit-form-picker.component'

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
export class ObservationEditComponent implements OnInit, OnChanges, DoCheck {
  @Input() forms: any[]
  @Input() formGroup: FormGroup
  @Input() preview: boolean

  // @Input() form: any
  @Input() observation: any

  @Output() close = new EventEmitter<any>()

  @ViewChild('editContent', { static: true }) editContent: ElementRef
  @ViewChild('dragHandle', { static: true }) dragHandle: ElementRef
  @ViewChildren('form') formElements: QueryList<ElementRef>;

  event: any

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

      this.isNewObservation = this.observation.id === 'new'
      this.initialObservation = JSON.parse(JSON.stringify(this.observation))
      this.geometryStyle = { ...this.observation.style }

      if (this.isNewObservation) {
        this.mapService.addFeaturesToLayer([this.observation], 'Observations')
      }
    }

    if (changes.forms && changes.forms.currentValue) {
      const primaryForm = this.forms.length ? this.forms[0] : { fields: [] }
      this.primaryField = primaryForm.fields.find(field => {
        return field.name === primaryForm.primaryField
      }) || {}

      this.secondaryField = primaryForm.fields.find(field => {
        return field.name === primaryForm.variantField
      }) || {}
    }
  }

  ngDoCheck(): void {
    if (this.primaryField.value !== this.primaryFieldValue || this.secondaryField.value !== this.secondaryFieldValue) {
      this.primaryFieldValue = this.primaryField.value
      this.secondaryFieldValue = this.secondaryField.value

      const observation = JSON.parse(JSON.stringify(this.observation))
      this.formToObservation(this.formGroup, observation)

      const style = this.observationService.getObservationStyleForForm(observation, this.event, this.forms[0])
      observation.style = style
      this.geometryStyle = style

      this.mapService.updateFeatureForLayer(observation, 'Observations')
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

  formToObservation(formGroup: FormGroup, observation: any): any {
    const geometry = formGroup.get('geometry').value

    // put all coordinates in -180 to 180
    switch (geometry.type) {
      case 'Point':
        if (geometry.coordinates[0] < -180) geometry.coordinates[0] = geometry.coordinates[0] + 360
        else if (geometry.coordinates[0] > 180) geometry.coordinates[0] = geometry.coordinates[0] - 360
        break;
      case 'LineString':
        for (let i = 0; i < geometry.coordinates.length; i++) {
          const coord = geometry.coordinates[i];
          while (coord[0] < -180) coord[0] = coord[0] + 360
          while (coord[0] > 180) coord[0] = coord[0] - 360
        }
        break;
      case 'Polygon':
        for (let p = 0; p < geometry.coordinates.length; p++) {
          const poly = geometry.coordinates[p];
          for (let i = 0; i < poly.length; i++) {
            const coord = poly[i];
            while (coord[0] < -180) coord[0] = coord[0] + 360
            while (coord[0] > 180) coord[0] = coord[0] - 360
          }
        }
        break;
    }
    observation.geometry = geometry;

    observation.properties.timestamp = formGroup.get('timestamp').value

    observation.properties.forms = [];

    const forms = formGroup.get('forms') as FormGroup
    Object.keys(forms.controls).forEach(formId => {
      const propertiesForm = {
        formId: formId
      }

      // TODO multi-form filter out archived fields
      // Do I need to do this if archived field controls
      // are not added 

      const group = forms.controls[formId] as FormGroup
      Object.keys(group.controls).forEach(fieldName => {
        propertiesForm[fieldName] = group.controls[fieldName].value
      })
    })

    // form.forms.forEach(observationForm => {
    //   const propertiesForm = {
    //     formId: observationForm.id
    //   };

    //   const fields = observationForm.fields.filter(field => {
    //     return !field.archived;
    //   });

    //   fields.forEach(field => {
    //     propertiesForm[field.name] = field.value;
    //   })

    //   observation.properties.forms.push(propertiesForm);
    // })
  }

  save(): void {
    // TODO multi-form validate number of forms or let server?

    // TODO touch all fields so errors show
    // Maybe just trigger form submit
    // TODO move to observation failed response
    this.formGroup.markAllAsTouched()

    if (this.formRemoveSnackbar) {
      this.formRemoveSnackbar.dismiss()
    }

    this.saving = true
    const markedForDelete = this.observation.attachments ? this.observation.attachments.filter(attachment => attachment.markedForDelete) : []
    // TODO multi-form, need to parse FormGroup to observation
    this.formToObservation(this.formGroup, this.observation);

    // TODO look at this: this is a hack that will be corrected when we pull ids from the server
    const id = this.observation.id;
    if (id === 'new') {
      delete this.observation.id;
    }

    this.eventService.saveObservation(this.observation).then(observation => {
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
        this.forms = null
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

  onGeometryChanged(event): void {
    this.formGroup.get('geometry').setValue(event.feature ? event.feature.geometry : null)
  }

  pickForm(): void {
    this.formOptions.expand = true
    this.bottomSheet.open(ObservationEditFormPickerComponent, {
      panelClass: 'feed-panel'
    }).afterDismissed().subscribe(form => {
      // const copy = JSON.parse(JSON.stringify(form))
      // this.forms.push(copy)
      const forms = this.formGroup.get('forms') as FormArray
      const fieldsGroup = new FormArray([])
      fieldsGroup['definition'] = form
      forms.push(new FormGroup({
        [form.id]: fieldsGroup
      }))

      this.formElements.changes.pipe(first()).subscribe((queryList: QueryList<ElementRef>) => {
        queryList.last.nativeElement.scrollIntoView({ behavior: 'smooth' });
      })
    })
  }

  removeForm(form: any): void {
    const index = this.forms.indexOf(form);
    this.forms.splice(index, 1);

    this.formRemoveSnackbar = this.snackBar.open('Form Removed', 'UNDO', {
      duration: 5000,
      panelClass: 'form-remove-snackbar',
    })
    
    this.formRemoveSnackbar.onAction().subscribe(() => {
      this.forms.splice(index, 0, form)
    })
  }

  reorderForm(event: CdkDragDrop<any, any>): void {
    // TODO multi-form cannot just move forms, have to move form controls maybe??
    if (event.currentIndex === event.previousIndex) return

    moveItemInArray(this.forms, event.previousIndex, event.currentIndex);
  }

  dragStart(event: DragEvent): void {
    this.document.body.classList.add('item-drag')
  }

  dragEnd(event: DragEvent): void {
    this.document.body.classList.remove('item-drag')
  }
}

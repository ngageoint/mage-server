import { CdkDragDrop, DragDropModule, moveItemInArray } from "@angular/cdk/drag-drop";
import { ScrollingModule } from "@angular/cdk/scrolling";

import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  EventEmitter,
  Injector,
  input,
  linkedSignal,
  Output,
  signal,
  viewChild,
  viewChildren,
  inject
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormArray, FormControl, FormGroup, Validators } from "@angular/forms";
import { DomSanitizer } from "@angular/platform-browser";
import { catchError, distinctUntilChanged, switchMap } from "rxjs/operators";
import { of, Subject } from "rxjs";
import { ObservationEditFormPickerComponent } from "./observation-edit-form-picker.component";
import moment from 'moment';
import { ObservationEditDiscardComponent } from "./observation-edit-discard/observation-edit-discard.component";
import { MatSnackBar, MatSnackBarRef, SimpleSnackBar } from "@angular/material/snack-bar";
import { MatIconModule, MatIconRegistry } from "@angular/material/icon";
import { MatDialog } from "@angular/material/dialog";
import { MatBottomSheet } from "@angular/material/bottom-sheet";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatToolbarModule } from "@angular/material/toolbar";
import {
  AttachmentService,
  AttachmentUploadEvent,
  AttachmentUploadStatus,
} from "../attachment/attachment.service";
import { FileUpload } from "../attachment/attachment-upload/attachment-upload.component";
import { AttachmentAction } from "./observation-edit-attachment/observation-edit-attachment-action";
import { GeometryEditEvent, ObservationEditGeometryComponent } from "./observation-edit-geometry/observation-edit-geometry.component";
import { MapService } from "src/app/map/map.service";
import { UserService } from "src/app/user/user.service";
import { EventService } from "src/app/event/event.service";
import { ObservationService } from "../observation.service";
import { EventPreference } from "core-lib-src/user";
import { Attachment, ObservationDraft } from "mage-web-app/entities/observation/entities.observation";
import { activeFormFields, Form, FormField } from "mage-web-app/entities/event/entities.event";
import { ObservationEditDateComponent } from "./observation-edit-date/observation-edit-date.component";
import { ObservationEditFormComponent } from "./observation-edit-form.component";

type FormEntryControls = {
  id: FormControl<string | null>
  formId: FormControl<number>
  [fieldName: string]: FormControl<any>
}

type FormEntryGroup = FormGroup<FormEntryControls>

type ObservationFormControls = {
  id: FormControl<string>
  eventId: FormControl<number>
  type: FormControl<'Feature'>
  geometry: FormControl<GeoJSON.Geometry>
  properties: FormGroup<{
    timestamp: FormControl<Date>
    forms: FormArray<FormEntryGroup>
  }>
}

@Component({
    selector: "observation-edit",
    templateUrl: "./observation-edit.component.html",
    styleUrls: ["./observation-edit.component.scss"],
    imports: [
        DragDropModule,
        ScrollingModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatProgressBarModule,
        MatToolbarModule,
        ObservationEditDateComponent,
        ObservationEditFormComponent,
        ObservationEditGeometryComponent,
    ]
})
export class ObservationEditComponent {
  observation = input.required<any>();
  currentObservation = linkedSignal(() => this.observation());
  attachments = [];

  @Output() closed = new EventEmitter<any>();

  editContent = viewChild.required<ElementRef>('editContent');
  formElements = viewChildren<ElementRef>('form');

  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private loadEventPreferences$ = new Subject<number>();

  event: any;
  formGroup = signal<FormGroup<ObservationFormControls>>(undefined);
  formDefinitions = signal<Record<number, Form>>(undefined);
  eventPreferences = signal<EventPreference | null>(null);
  timestampDefinition = {
    title: "",
    type: "date",
    name: "timestamp",
    required: true,
  };
  geometryDefinition = {
    title: "Location",
    type: "geometry",
    name: "geometry",
    required: true,
  };

  mask = false;
  saving = signal(false);
  error = signal<any>(null);

  uploads: Attachment[] = [];
  attachmentUrl = signal<string>(undefined);

  isNewObservation = signal(false);

  initialObservation: any;
  geometryStyle = signal<any>(undefined);

  primaryField: any;
  primaryFieldValue: string;
  secondaryField: any;
  secondaryFieldValue: string;

  formRemoveSnackbar: MatSnackBarRef<SimpleSnackBar>;

  constructor(
    sanitizer: DomSanitizer,
    matIconRegistry: MatIconRegistry,
    public dialog: MatDialog,
    private bottomSheet: MatBottomSheet,
    private snackBar: MatSnackBar,
    private attachmentService: AttachmentService,
    private mapService: MapService,
    private userService: UserService,
    private eventService: EventService,
    private observationService: ObservationService
  ) {
    matIconRegistry.addSvgIcon(
      "handle",
      sanitizer.bypassSecurityTrustResourceUrl("assets/images/handle-24px.svg")
    );

    this.loadEventPreferences$
      .pipe(
        distinctUntilChanged(),
        switchMap((eventId) =>
          this.userService
            .getEventPreferences(eventId)
            .pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((preferences) => {
        this.eventPreferences.set(preferences);
      });

    this.attachmentService.upload$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.onAttachmentUpload(event));

    effect(() => {
      const observation = this.observation();

      this.event = this.eventService.getEventById(observation.eventId);
      this.formDefinitions.set(this.eventService
        .getFormsForEvent(this.event)
        .reduce<Record<number, Form>>((map, form) => {
          map[form.id] = form;
          return map;
        }, {}));

      this.isNewObservation.set(observation.id === "new");
      this.initialObservation = JSON.parse(JSON.stringify(observation));

      if (observation.style) {
        this.geometryStyle.set(JSON.parse(JSON.stringify(observation.style)));
      }

      if (this.isNewObservation()) {
        this.mapService.addFeaturesToLayer([observation], "observations");
      }

      this.toFormGroup(observation);
      this.updatePrimarySecondary();
      this.loadEventPreferences$.next(this.event.id);
    });
  }

  ngOnDestroy(): void {
    if (this.isNewObservation()) {
      this.mapService.removeFeatureFromLayer({ id: "new" }, "observations");
    }
  }

  // TODO multi-form build out validators here as well for each form control
  toFormGroup(observation: ObservationDraft): void {
    const formArray = new FormArray<FormEntryGroup>([]);
    const observationForms = observation.properties.forms || [];
    observationForms.forEach((observationForm) => {
      const formDefinition: Form = this.formDefinitions()[observationForm.formId];
      const fieldGroup = this.formEntryGroup(observationForm.id, formDefinition);

      activeFormFields(formDefinition.fields).forEach((field) => {
        const value = this.isNewObservation() && !(field.name in observationForm)
          ? field.value
          : observationForm[field.name];
        fieldGroup.addControl(field.name, this.fieldControl(field, value));
      });

      formArray.push(fieldGroup);
    });

    this.formGroup.set(new FormGroup<ObservationFormControls>({
      id: new FormControl(observation.id, { nonNullable: true }),
      eventId: new FormControl(observation.eventId, { nonNullable: true }),
      type: new FormControl(observation.type, { nonNullable: true }),
      geometry: new FormControl(observation.geometry, { nonNullable: true, validators: Validators.required }),
      properties: new FormGroup({
        timestamp: new FormControl(moment(observation.properties.timestamp).toDate(), { nonNullable: true, validators: Validators.required }),
        forms: formArray,
      }),
    }));

    if (
      observation.properties.forms.length === 0 &&
      this.hasForms() &&
      observation.id === "new"
    ) {
      this.pickForm();
    }
  }

  private get forms(): FormArray<FormEntryGroup> {
    return this.formGroup().controls.properties.controls.forms;
  }

  private formEntryGroup(id: string | null, formDefinition: Form): FormEntryGroup {
    return new FormGroup<FormEntryControls>({
      id: new FormControl<string | null>(id),
      formId: new FormControl(formDefinition.id, { nonNullable: true }),
    });
  }

  private fieldControl(field: FormField, value: any): FormControl<any> {
    return new FormControl<any>(value, field.required ? Validators.required : null);
  }

  updatePrimarySecondary(): void {
    if (!this.forms.length) return;

    const primaryFormGroup = this.forms.at(0);
    const definition = this.formDefinitions()[primaryFormGroup.controls.formId.value];
    const { primaryFeedField, secondaryFeedField } = definition;

    let primaryFieldValue;
    if (primaryFeedField && primaryFormGroup.contains(primaryFeedField)) {
      this.primaryField = definition.fields.find((field) => field.name === primaryFeedField);
      primaryFieldValue = primaryFormGroup.controls[primaryFeedField].value;
    }

    let secondaryFieldValue;
    if (secondaryFeedField && primaryFormGroup.contains(secondaryFeedField)) {
      this.secondaryField = definition.fields.find((field) => field.name === secondaryFeedField);
      secondaryFieldValue = primaryFormGroup.controls[secondaryFeedField].value;
    }

    if (
      (this.primaryField && primaryFieldValue !== this.primaryFieldValue) ||
      (this.secondaryField && secondaryFieldValue !== this.secondaryFieldValue)
    ) {
      this.primaryFieldValue = this.primaryField ? primaryFieldValue : null;
      this.secondaryFieldValue = this.secondaryField ? secondaryFieldValue : null;

      const observation = this.formGroup().getRawValue();
      const style = this.observationService.getObservationStyleForForm(
        observation,
        this.event,
        definition
      );
      this.geometryStyle.set(style);

      this.mapService.updateFeatureForLayer({ ...observation, style }, "observations");
    }
  }

  save(): void {
    if (this.formRemoveSnackbar) {
      this.formRemoveSnackbar.dismiss();
    }

    this.saving.set(true);
    this.uploads = [];

    // TODO look at this: this is a hack that will be corrected when we pull ids from the server
    const form: ObservationDraft = this.formGroup().getRawValue();
    const id = form.id;
    if (form.id === "new") {
      delete form.id;
    }

    this.eventService.saveObservation(form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (observation) => {
        // If this feature was added to the map as a new observation, remove it
        // as the event service will add it back to the map based on it new id
        // if it passes the current filter.
        if (id === "new") {
          this.mapService.removeFeatureFromLayer({ id: id }, "observations");
        }

        this.error.set(null);
        this.currentObservation.set(observation);
        this.formGroup().controls.id.setValue(observation.id);

        form.properties.forms.forEach((form) => {
          const formDefinition = this.formDefinitions()[form.formId];
          Object.keys(form).forEach((fieldName) => {
            const fieldDefinition = formDefinition.fields.find(
              (field) => field.name === fieldName
            );
            const value = form[fieldName];
            if (fieldDefinition?.type === "attachment" && Array.isArray(value)) {
              value.forEach((fieldAttachment) => {
                const attachment = observation.attachments.find(
                  (attachment) => {
                    return (
                      !attachment.url &&
                      attachment.name === fieldAttachment.name &&
                      attachment.contentType == fieldAttachment.contentType
                    );
                  }
                );

                if (
                  fieldAttachment.file &&
                  fieldAttachment.action === AttachmentAction.ADD &&
                  attachment
                ) {
                  fieldAttachment.attachmentId = attachment.id;
                  this.uploads.push(attachment);
                }
              });
            }
          });
        });

        if (this.uploads.length) {
          this.attachmentUrl.set(observation.url);
        } else {
          this.closed.emit(this.currentObservation());
        }
      },
      error: (err) => {
        this.formGroup().markAllAsTouched();

        if (id === "new") {
          this.currentObservation.update((observation) => ({ ...observation, id: "new" }));
        }

        this.saving.set(false);
        this.error.set({
          message: err.error?.message || 'Please check your entries and try again.',
        });
      },
    });
  }

  cancel(): void {
    if (this.formRemoveSnackbar) {
      this.formRemoveSnackbar.dismiss();
    }

    this.dialog
      .open(ObservationEditDiscardComponent, {
        autoFocus: false,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result === "discard") {
          this.currentObservation.update((observation) => ({ ...observation, geometry: this.initialObservation.geometry }));
          if (this.currentObservation().id !== "new") {
            this.mapService.updateFeatureForLayer(this.currentObservation(), "observations");
          } else {
            this.mapService.removeFeatureFromLayer(this.currentObservation(), "observations");
          }
          this.closed.emit();
        }
      });
  }

  hasForms(): boolean {
    const definitions = this.formDefinitions() || {};
    return Object.keys(definitions).length > 0;
  }

  onGeometryEdit(event: GeometryEditEvent): void {
    this.mask = event.action === "edit";

    if (event.action === "edit") {
      const elementBounds = event.source.nativeElement.getBoundingClientRect();
      const parentBounds =
        this.editContent().nativeElement.getBoundingClientRect();
      if (
        elementBounds.top < parentBounds.top ||
        elementBounds.bottom > parentBounds.bottom
      ) {
        event.source.nativeElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }

  pickForm(): void {
    this.bottomSheet
      .open(ObservationEditFormPickerComponent, {
        panelClass: "sidebar",
      })
      .afterDismissed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((form: Form | undefined) => {
        if (!form) return;

        const fieldsGroup = this.formEntryGroup(null, form);
        activeFormFields(form.fields).forEach((field) => {
          fieldsGroup.addControl(field.name, this.fieldControl(field, field.value));
        });

        this.forms.push(fieldsGroup);

        afterNextRender(() => {
          const elements = this.formElements();
          elements[elements.length - 1]?.nativeElement.scrollIntoView({ behavior: "smooth" });
        }, { injector: this.injector });
      });
  }

  removeForm(formGroup: FormEntryGroup): void {
    const formArray = this.forms;
    const index = formArray.controls.indexOf(formGroup);
    formArray.removeAt(index);

    this.formRemoveSnackbar = this.snackBar.open("Form Deleted", "UNDO", {
      duration: 5000,
      panelClass: "form-remove-snackbar",
      verticalPosition: 'bottom',
    });

    this.formRemoveSnackbar.onAction()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        formArray.insert(index, formGroup);
      });
  }

  reorderForm(event: CdkDragDrop<any, any>): void {
    if (event.currentIndex === event.previousIndex) return;

    moveItemInArray(this.forms.controls, event.previousIndex, event.currentIndex);

    // re-calculate primary/secondary based new first form
    if (event.currentIndex === 0 || event.previousIndex === 0) {
      this.updatePrimarySecondary();
    }
  }

  private onAttachmentUpload(event: AttachmentUploadEvent): void {
    switch (event.status) {
      case AttachmentUploadStatus.COMPLETE: {
        this.eventService.addAttachmentToObservation(
          this.currentObservation(),
          event.response
        );

        this.uploads = this.uploads.filter(
          (attachment) => attachment.id !== event.upload.attachmentId
        );
        if (this.uploads.length === 0) {
          this.saving.set(false);
          this.closed.emit(this.currentObservation());
        }

        break;
      }
      case AttachmentUploadStatus.ERROR: {
        this.snackBar.open(event.response?.error, undefined, { duration: 4000 });

        this.forms.controls.forEach((formGroup) => {
          const formDefinition = this.formDefinitions()[formGroup.controls.formId.value];
          Object.keys(formGroup.controls).forEach((fieldName) => {
            const fieldDefinition = formDefinition.fields.find(
              (field) => field.name === fieldName
            );
            if (fieldDefinition?.type === "attachment") {
              const control = formGroup.controls[fieldName];
              const attachments: FileUpload[] = control.value || [];
              control.setValue(
                attachments.filter((attachment) => attachment.attachmentId !== event.upload.attachmentId)
              );
            }
          });
        });

        this.saving.set(false);
        break;
      }
    }
  }
}

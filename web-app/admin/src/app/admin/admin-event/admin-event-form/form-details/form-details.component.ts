import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { StateService } from '@uirouter/angular';
import { EventsService } from '../../events.service';
import { LocalStorageService, UserService } from '../../../../upgrade/ajs-upgraded-providers';
import { Event as MageEvent } from 'src/app/filter/filter.types';
import { AdminBreadcrumb } from '../../../admin-breadcrumb/admin-breadcrumb.model';
import { ObservationFeedHelper, Observation, Field } from './observation-feed-helper';
import { FieldDialogComponent, FieldDialogData } from './field-dialog/field-dialog.component';

interface FormData {
  id?: number;
  name?: string;
  description?: string;
  color?: string;
  default?: boolean;
  archived?: boolean;
  fields?: any[];
  userFields?: any[];
  primaryField?: string;
  variantField?: string;
  primaryFeedField?: string;
  secondaryFeedField?: string;
  style?: any;
}

interface FieldType {
  name: string;
  title: string;
  hidden?: boolean;
}

interface ErrorDialogData {
  title: string;
  message: string;
  errors?: any;
}

@Component({
  selector: 'mage-form-details',
  templateUrl: './form-details.component.html',
  styleUrls: ['./form-details.component.scss']
})
export class FormDetailsComponent implements OnInit {
  event: MageEvent | null = null;
  form: FormData = {};
  token: string | null = null;
  saving = false;
  generalFormSubmitted = false;
  formValid = true;
  formDirty = false;
  breadcrumbs: AdminBreadcrumb[] = [];

  // Collapsible section state
  showFieldsSection = false;
  showMapSection = false;
  showFeedSection = false;
  showSymbologyDetails = true;

  // Section-specific dirty tracking and saving state
  fieldsChanged = false;
  mapChanged = false;
  feedsChanged = false;
  savingFields = false;
  savingMap = false;
  savingFeeds = false;

  // Fields tab
  newField: Field = {};
  observations: Observation[] = [];
  fieldTypes: FieldType[] = [
    { name: 'textfield', title: 'Text' },
    { name: 'textarea', title: 'Text Area' },
    { name: 'numberfield', title: 'Number' },
    { name: 'email', title: 'Email' },
    { name: 'date', title: 'Date' },
    { name: 'checkbox', title: 'Checkbox' },
    { name: 'radio', title: 'Radio Buttons' },
    { name: 'dropdown', title: 'Select' },
    { name: 'multiselectdropdown', title: 'Multiple Select', hidden: true },
    { name: 'geometry', title: 'Location' },
    { name: 'attachment', title: 'Attachment' },
    { name: 'userDropdown', title: 'User Select' },
    { name: 'multiSelectUserDropdown', title: 'User Multiple Select', hidden: true },
    { name: 'hidden', title: 'Hidden' }
  ];

  attachmentAllowedTypes = [
    { name: 'image', title: 'Image' },
    { name: 'video', title: 'Video' },
    { name: 'audio', title: 'Audio' }
  ];

  constructor(
    private eventsService: EventsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    @Inject(LocalStorageService) private localStorageService: any,
    @Inject(UserService) private userService: any,
    private stateService: StateService
  ) { }

  ngOnInit(): void {
    this.token = this.localStorageService.getToken();

    const eventId = this.stateService.params.eventId;
    const formId = this.stateService.params.formId;

    // Initialize new field with default values
    this.newField = {
      type: 'textfield',
      required: false
    };

    if (eventId) {
      this.eventsService.getEventById(eventId).subscribe({
        next: (event) => {
          this.event = event;

          // Set up breadcrumbs
          this.breadcrumbs = [
            {
              title: 'Events',
              icon: 'fa-calendar',
              state: { name: 'admin.events' }
            },
            {
              title: event.name,
              state: { name: 'admin.event', params: { eventId: event.id } }
            },
            {
              title: formId ? 'Edit Form' : 'New Form'
            }
          ];

          if (formId && event.forms) {
            const existingForm = event.forms.find(f => f.id?.toString() === formId);
            if (existingForm) {
              this.form = { ...existingForm };
              // Initialize fields array if not present
              if (!this.form.fields) {
                this.form.fields = [];
              }
              if (!this.form.userFields) {
                this.form.userFields = [];
              }
              this.breadcrumbs[2].title = existingForm.name || 'Edit Form';
            }
          } else {
            // New form
            this.form = {
              archived: false,
              color: '#' + (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0'),
              fields: [],
              userFields: []
            };
          }

          // Generate sample observations for feed preview
          if (this.form.id) {
            this.generateSampleObservations();
          }
        },
        error: (error) => {
          console.error('Error loading event:', error);
          this.snackBar.open('Error loading event', 'Close', { duration: 3000 });
        }
      });
    }
  }

  onFormChange(): void {
    this.formDirty = true;
  }

  validateForm(): boolean {
    this.generalFormSubmitted = true;
    // Check if required fields are filled
    this.formValid = !!(this.form.name && this.form.color);
    return this.formValid;
  }

  saveForm(): void {
    if (!this.validateForm()) {
      return;
    }

    if (!this.event?.id) {
      return;
    }

    this.saving = true;

    const saveObservable = this.form.id
      ? this.eventsService.updateForm(this.event.id.toString(), this.form.id.toString(), this.form)
      : this.eventsService.createForm(this.event.id.toString(), this.form);

    saveObservable.subscribe({
      next: (savedForm) => {
        this.saving = false;
        this.formDirty = false;
        this.generalFormSubmitted = false;
        // Update form properties individually to preserve ngModel bindings
        Object.assign(this.form, savedForm);
        this.snackBar.open('Form saved successfully', 'Close', { duration: 3000 });
      },
      error: (response) => {
        this.saving = false;
        const data = response.error || {};
        this.showError({
          title: 'Error Saving Form',
          message: data.errors
            ? "If the problem persists please contact your MAGE administrator for help."
            : "Please try again later, if the problem persists please contact your MAGE administrator for help.",
          errors: data.errors
        });
      }
    });
  }

  saveFieldsToApi(): void {
    if (!this.event?.id || !this.form.id || this.savingFields) {
      return;
    }

    this.savingFields = true;

    // Store current map and feed field values
    const currentPrimaryField = this.form.primaryField;
    const currentVariantField = this.form.variantField;
    const currentPrimaryFeedField = this.form.primaryFeedField;
    const currentSecondaryFeedField = this.form.secondaryFeedField;

    this.eventsService.updateForm(this.event.id.toString(), this.form.id.toString(), this.form).subscribe({
      next: (savedForm) => {
        this.savingFields = false;
        this.fieldsChanged = false;
        // Update form properties individually to preserve ngModel bindings
        Object.assign(this.form, savedForm);
        // Restore map and feed fields if they weren't in the saved response
        if (savedForm.primaryField === undefined) this.form.primaryField = currentPrimaryField;
        if (savedForm.variantField === undefined) this.form.variantField = currentVariantField;
        if (savedForm.primaryFeedField === undefined) this.form.primaryFeedField = currentPrimaryFeedField;
        if (savedForm.secondaryFeedField === undefined) this.form.secondaryFeedField = currentSecondaryFeedField;
        this.snackBar.open('Fields saved successfully', 'Close', { duration: 3000 });
      },
      error: (response) => {
        this.savingFields = false;
        const data = response.error || {};
        this.showError({
          title: 'Error Saving Fields',
          message: data.errors
            ? "If the problem persists please contact your MAGE administrator for help."
            : "Please try again later, if the problem persists please contact your MAGE administrator for help.",
          errors: data.errors
        });
      }
    });
  }

  saveMap(): void {
    if (!this.event?.id || !this.form.id) {
      return;
    }

    this.savingMap = true;

    // Store current field and feed values
    const currentFields = this.form.fields;
    const currentPrimaryFeedField = this.form.primaryFeedField;
    const currentSecondaryFeedField = this.form.secondaryFeedField;

    this.eventsService.updateForm(this.event.id.toString(), this.form.id.toString(), this.form).subscribe({
      next: (savedForm) => {
        this.savingMap = false;
        this.mapChanged = false;
        // Update form properties individually to preserve ngModel bindings
        Object.assign(this.form, savedForm);
        // Restore fields and feed configuration if they weren't in the saved response
        if (savedForm.fields === undefined) this.form.fields = currentFields;
        if (savedForm.primaryFeedField === undefined) this.form.primaryFeedField = currentPrimaryFeedField;
        if (savedForm.secondaryFeedField === undefined) this.form.secondaryFeedField = currentSecondaryFeedField;
        this.snackBar.open('Map configuration saved successfully', 'Close', { duration: 3000 });
      },
      error: (response) => {
        this.savingMap = false;
        const data = response.error || {};
        this.showError({
          title: 'Error Saving Map Configuration',
          message: data.errors
            ? "If the problem persists please contact your MAGE administrator for help."
            : "Please try again later, if the problem persists please contact your MAGE administrator for help.",
          errors: data.errors
        });
      }
    });
  }

  saveFeeds(): void {
    if (!this.event?.id || !this.form.id) {
      return;
    }

    this.savingFeeds = true;
    this.eventsService.updateForm(this.event.id.toString(), this.form.id.toString(), this.form).subscribe({
      next: () => {
        this.savingFeeds = false;
        this.feedsChanged = false;
        this.snackBar.open('Feed configuration saved successfully', 'Close', { duration: 3000 });
      },
      error: (response) => {
        this.savingFeeds = false;
        const data = response.error || {};
        this.showError({
          title: 'Error Saving Feed Configuration',
          message: data.errors
            ? "If the problem persists please contact your MAGE administrator for help."
            : "Please try again later, if the problem persists please contact your MAGE administrator for help.",
          errors: data.errors
        });
      }
    });
  }

  archiveForm(): void {
    if (!this.event?.id || !this.form.id) {
      return;
    }

    this.form.archived = true;
    this.eventsService.updateForm(this.event.id.toString(), this.form.id.toString(), this.form).subscribe({
      next: () => {
        this.snackBar.open('Form archived successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error archiving form:', error);
        this.snackBar.open('Error archiving form', 'Close', { duration: 3000 });
      }
    });
  }

  restoreForm(): void {
    if (!this.event?.id || !this.form.id) {
      return;
    }

    this.form.archived = false;
    this.eventsService.updateForm(this.event.id.toString(), this.form.id.toString(), this.form).subscribe({
      next: () => {
        this.snackBar.open('Form restored successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error restoring form:', error);
        this.snackBar.open('Error restoring form', 'Close', { duration: 3000 });
      }
    });
  }

  showError(error: ErrorDialogData): void {
    const errorMessage = error.title + ': ' + error.message;
    this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
  }

  navigateToFields(): void {
    if (this.event?.id && this.form.id) {
      this.stateService.go('admin.formFieldsEdit', { eventId: this.event.id, formId: this.form.id });
    }
  }

  navigateToMap(): void {
    if (this.event?.id && this.form.id) {
      this.stateService.go('admin.formMapEdit', { eventId: this.event.id, formId: this.form.id });
    }
  }

  navigateToFeed(): void {
    if (this.event?.id && this.form.id) {
      this.stateService.go('admin.formFeedEdit', { eventId: this.event.id, formId: this.form.id });
    }
  }

  exportForm(): void {
    if (!this.event?.id || !this.form.id || !this.token) {
      return;
    }

    const url = `/api/events/${this.event.id}/${this.form.id}/form.zip?access_token=${this.token}`;
    const fileName = `${this.form.name || 'form'}.zip`;

    // Create a temporary anchor element to trigger download
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    this.snackBar.open('Exporting form...', 'Close', { duration: 2000 });
  }

  // Fields Tab Methods
  onFieldsChange(fields: Field[]): void {
    this.form.fields = fields;
    this.fieldsChanged = true;
    this.saveFieldsToApi();
  }

  getActiveFields(): Field[] {
    if (!this.form.fields) return [];
    return this.form.fields.filter(field => !field.archived).sort((a, b) => (a.id || 0) - (b.id || 0));
  }

  getFieldTypeLabel(type: string): string {
    const fieldType = this.fieldTypes.find(ft => ft.name === type);
    return fieldType ? fieldType.title : type;
  }

  showAddOptions(field: Field): boolean {
    return field.type === 'radio' || field.type === 'dropdown' || field.type === 'multiselectdropdown';
  }

  isMemberField(field: Field): boolean {
    return this.form.userFields?.includes(field.name || '') || false;
  }

  isUserDropdown(field: Field): boolean {
    return field.type === 'userDropdown';
  }

  openAddFieldDialog(): void {
    const dialogRef = this.dialog.open(FieldDialogComponent, {
      width: '600px',
      panelClass: 'add-field-dialog',
      data: {
        fieldTypes: this.fieldTypes,
        attachmentAllowedTypes: this.attachmentAllowedTypes,
        editMode: false
      } as FieldDialogData
    });

    dialogRef.afterClosed().subscribe((result: Field | undefined) => {
      if (result) {
        this.addFieldFromDialog(result);
      }
    });
  }

  addFieldFromDialog(fieldData: Field): void {
    if (!this.form.fields) {
      this.form.fields = [];
    }

    const fields = this.form.fields;
    const maxId = fields.length > 0 ? Math.max(...fields.map(f => f.id || 0)) : -1;
    const newId = maxId + 1;

    const field: Field = {
      ...fieldData,
      id: newId,
      name: `field${newId}`,
      archived: false
    };

    // Ensure choices array exists for field types that need it
    if (!field.choices && this.showAddOptions(field)) {
      field.choices = [];
    }

    fields.push(field);

    // Auto-save after adding field
    this.saveFieldsToApi();
  }

  getAttachmentTypesDisplay(field: Field): string {
    if (!field.allowedAttachmentTypes || field.allowedAttachmentTypes.length === 0) {
      return '';
    }
    return field.allowedAttachmentTypes
      .map(typeName => {
        const type = this.attachmentAllowedTypes.find(t => t.name === typeName);
        return type ? type.title : typeName;
      })
      .join(', ');
  }

  removeField(field: Field): void {
    if (field.id !== undefined) {
      const fieldToRemove = this.form.fields?.find(f => f.id === field.id);
      if (fieldToRemove) {
        fieldToRemove.archived = true;

        // Auto-save after removing field
        this.saveFieldsToApi();
      }
    }
  }

  moveFieldUp(field: Field): void {
    if (!this.form.fields || !field.id) return;

    const sortedFields = this.getActiveFields();
    const currentIndex = sortedFields.findIndex(f => f.id === field.id);

    if (currentIndex > 0) {
      const fieldToMoveDown = sortedFields[currentIndex - 1];
      const tempId = fieldToMoveDown.id;
      fieldToMoveDown.id = field.id;
      field.id = tempId;
      this.fieldsChanged = true;
    }
  }

  moveFieldDown(field: Field): void {
    if (!this.form.fields || !field.id) return;

    const sortedFields = this.getActiveFields();
    const currentIndex = sortedFields.findIndex(f => f.id === field.id);

    if (currentIndex < sortedFields.length - 1) {
      const fieldToMoveUp = sortedFields[currentIndex + 1];
      const tempId = fieldToMoveUp.id;
      fieldToMoveUp.id = field.id;
      field.id = tempId;
      this.fieldsChanged = true;
    }
  }

  onFieldDrop(event: CdkDragDrop<any[]>): void {
    if (!this.form.fields || event.previousIndex === event.currentIndex) return;

    // Get active (non-archived) fields
    const activeFields = this.form.fields.filter(f => !f.archived);

    // Move the item in the active fields array
    const movedField = activeFields[event.previousIndex];
    activeFields.splice(event.previousIndex, 1);
    activeFields.splice(event.currentIndex, 0, movedField);

    // Update IDs based on new positions
    activeFields.forEach((field, index) => {
      field.id = index;
    });

    // Rebuild the form.fields array with archived fields at the end
    const archivedFields = this.form.fields.filter(f => f.archived);
    this.form.fields = [...activeFields, ...archivedFields];

    // Auto-save after reordering fields
    this.saveFieldsToApi();
  }

  trackByFieldId(index: number, field: any): any {
    return field.id;
  }

  openEditFieldDialog(field: Field): void {
    const dialogRef = this.dialog.open(FieldDialogComponent, {
      width: '600px',
      panelClass: 'add-field-dialog',
      data: {
        fieldTypes: this.fieldTypes,
        attachmentAllowedTypes: this.attachmentAllowedTypes,
        editMode: true,
        existingField: field,
        isMemberField: this.isMemberField(field)
      } as FieldDialogData
    });

    dialogRef.afterClosed().subscribe((editedField: Field | undefined) => {
      if (editedField && this.form.fields) {
        // Find and update the field
        const fieldIndex = this.form.fields.findIndex(f => f.id === field.id);
        if (fieldIndex !== -1) {
          this.form.fields[fieldIndex] = { ...editedField };
          // Auto-save after editing field
          this.saveFieldsToApi();
        }
      }
    });
  }

  // Map Tab Methods
  getDropdownFields(excludeField?: string): Field[] {
    if (!this.form.fields) return [];
    return this.form.fields.filter(field =>
      field.type === 'dropdown' &&
      !field.archived &&
      field.name !== excludeField
    );
  }

  onMapFieldChange(): void {
    this.mapChanged = true;
  }

  toggleFieldsSection(): void {
    this.showFieldsSection = !this.showFieldsSection;
  }

  toggleMapSection(): void {
    this.showMapSection = !this.showMapSection;
  }

  toggleFeedSection(): void {
    this.showFeedSection = !this.showFeedSection;
  }

  toggleSymbologyDetails(): void {
    this.showSymbologyDetails = !this.showSymbologyDetails;
  }

  getPrimaryFieldChoices(): any[] {
    if (!this.form.primaryField || !this.form.fields) return [];
    const primaryField = this.form.fields.find(f => f.name === this.form.primaryField);
    return primaryField?.choices || [];
  }

  getVariantFieldChoices(): any[] {
    if (!this.form.variantField || !this.form.fields) return [];
    const variantField = this.form.fields.find(f => f.name === this.form.variantField);
    return variantField?.choices || [];
  }

  getIconUrl(primary: string, variant?: string): string | null {
    if (!this.form.style) return null;

    try {
      if (variant) {
        return this.form.style[primary]?.[variant]?.icon?.iconUrl || null;
      }
      return this.form.style[primary]?.icon?.iconUrl || null;
    } catch (e) {
      return null;
    }
  }

  getLineColor(primary: string, variant?: string): string {
    if (!this.form.style) return '#3388ff';

    try {
      if (variant) {
        return this.form.style[primary]?.[variant]?.style?.stroke || '#3388ff';
      }
      return this.form.style[primary]?.style?.stroke || '#3388ff';
    } catch (e) {
      return '#3388ff';
    }
  }

  getFillColor(primary: string, variant?: string): string {
    if (!this.form.style) return '#3388ff';

    try {
      if (variant) {
        return this.form.style[primary]?.[variant]?.style?.fill || '#3388ff';
      }
      return this.form.style[primary]?.style?.fill || '#3388ff';
    } catch (e) {
      return '#3388ff';
    }
  }

  // Feeds Tab Methods
  onFeedFieldChange(): void {
    this.feedsChanged = true;
    // Regenerate sample observations to reflect feed field changes
    if (this.form.id) {
      this.generateSampleObservations();
    }
  }

  // Helper method to get field title by field name
  getFieldTitle(fieldName: string | undefined): string {
    if (!fieldName || !this.form.fields) return '';
    const field = this.form.fields.find(f => f.name === fieldName);
    return field?.title || fieldName;
  }

  // Sample Observation Generation Methods
  generateSampleObservations(): void {
    this.userService.getMyself().then((myself: any) => {
      this.observations = ObservationFeedHelper.generateSampleObservations(
        this.form,
        Number(this.form.id),
        myself,
        this.stateService.params.eventId,
        this.localStorageService.getToken()
      );
    });
  }

}

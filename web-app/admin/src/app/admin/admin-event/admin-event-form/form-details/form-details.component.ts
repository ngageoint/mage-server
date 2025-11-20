import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { EventsService } from '../../events.service';
import { LocalStorageService, UserService } from '../../../../upgrade/ajs-upgraded-providers';
import { Event as MageEvent } from 'src/app/filter/filter.types';
import { AdminBreadcrumb } from '../../../admin-breadcrumb/admin-breadcrumb.model';
import { ObservationFeedHelper, Observation, Field } from './observation-feed-helper';
import { AddFieldDialogComponent, AddFieldDialogData, AddFieldResult } from './add-field-dialog/add-field-dialog.component';

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
  showFieldsSection = true;
  showMapSection = true;
  showFeedSection = true;
  showSymbologyDetails = false;

  // Section-specific dirty tracking and saving state
  fieldsChanged = false;
  mapChanged = false;
  feedsChanged = false;
  savingFields = false;
  savingMap = false;
  savingFeeds = false;

  // Field editing state
  editingFieldId: number | null = null;
  editingField: Field | null = null;

  // Original state for comparison
  private originalFields: any[] = [];
  private originalPrimaryField: string | undefined;
  private originalVariantField: string | undefined;
  private originalPrimaryFeedField: string | undefined;
  private originalSecondaryFeedField: string | undefined;

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
    { name: 'geometry', title: 'Location' },
    { name: 'attachment', title: 'Attachment' },
    { name: 'hidden', title: 'Hidden' }
  ];

  constructor(
    private eventsService: EventsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    @Inject(LocalStorageService) private localStorageService: any,
    @Inject(UserService) private userService: any,
    @Inject('$stateParams') private $stateParams: any,
    @Inject('$state') private $state: any
  ) { }

  ngOnInit(): void {
    this.token = this.localStorageService.getToken();

    const eventId = this.$stateParams.eventId;
    const formId = this.$stateParams.formId;

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

          // Store original state for change tracking
          this.storeOriginalState();

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

  private storeOriginalState(): void {
    this.originalFields = this.form.fields ? JSON.parse(JSON.stringify(this.form.fields)) : [];
    this.originalPrimaryField = this.form.primaryField;
    this.originalVariantField = this.form.variantField;
    this.originalPrimaryFeedField = this.form.primaryFeedField;
    this.originalSecondaryFeedField = this.form.secondaryFeedField;
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
        this.storeOriginalState();
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
        this.originalFields = this.form.fields ? JSON.parse(JSON.stringify(this.form.fields)) : [];
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
        this.originalPrimaryField = this.form.primaryField;
        this.originalVariantField = this.form.variantField;
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

    // Store current field and map values
    const currentFields = this.form.fields;
    const currentPrimaryField = this.form.primaryField;
    const currentVariantField = this.form.variantField;
    const currentPrimaryFeedField = this.form.primaryFeedField;
    const currentSecondaryFeedField = this.form.secondaryFeedField;

    this.eventsService.updateForm(this.event.id.toString(), this.form.id.toString(), this.form).subscribe({
      next: (savedForm) => {
        this.savingFeeds = false;
        this.feedsChanged = false;
        // Update form properties individually to preserve ngModel bindings
        Object.assign(this.form, savedForm);
        // Restore fields and map configuration if they weren't in the saved response
        if (savedForm.fields === undefined) this.form.fields = currentFields;
        if (savedForm.primaryField === undefined) this.form.primaryField = currentPrimaryField;
        if (savedForm.variantField === undefined) this.form.variantField = currentVariantField;
        if (savedForm.primaryFeedField === undefined) this.form.primaryFeedField = currentPrimaryFeedField;
        if (savedForm.secondaryFeedField === undefined) this.form.secondaryFeedField = currentSecondaryFeedField;
        this.originalPrimaryFeedField = this.form.primaryFeedField;
        this.originalSecondaryFeedField = this.form.secondaryFeedField;
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
    // Simple error display using snackbar for now
    // You can create a proper error dialog component if needed
    const errorMessage = error.title + ': ' + error.message;
    this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
  }

  navigateToFields(): void {
    if (this.event?.id && this.form.id) {
      this.$state.go('admin.formFieldsEdit', { eventId: this.event.id, formId: this.form.id });
    }
  }

  navigateToMap(): void {
    if (this.event?.id && this.form.id) {
      this.$state.go('admin.formMapEdit', { eventId: this.event.id, formId: this.form.id });
    }
  }

  navigateToFeed(): void {
    if (this.event?.id && this.form.id) {
      this.$state.go('admin.formFeedEdit', { eventId: this.event.id, formId: this.form.id });
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
  getActiveFields(): Field[] {
    if (!this.form.fields) return [];
    return this.form.fields.filter(field => !field.archived).sort((a, b) => (a.id || 0) - (b.id || 0));
  }

  getFieldTypeLabel(type: string): string {
    const fieldType = this.fieldTypes.find(ft => ft.name === type);
    return fieldType ? fieldType.title : type;
  }

  openAddFieldDialog(): void {
    const dialogRef = this.dialog.open(AddFieldDialogComponent, {
      width: '600px',
      panelClass: 'add-field-dialog',
      data: {
        fieldTypes: this.fieldTypes
      } as AddFieldDialogData
    });

    dialogRef.afterClosed().subscribe((result: AddFieldResult | undefined) => {
      if (result) {
        this.addFieldFromDialog(result);
      }
    });
  }

  addFieldFromDialog(fieldData: AddFieldResult): void {
    if (!this.form.fields) {
      this.form.fields = [];
    }

    const fields = this.form.fields;
    const maxId = fields.length > 0 ? Math.max(...fields.map(f => f.id || 0)) : -1;
    const newId = maxId + 1;

    const field: Field = {
      id: newId,
      name: `field${newId}`,
      title: fieldData.title,
      type: fieldData.type,
      required: fieldData.required,
      archived: false,
      choices: []
    };

    fields.push(field);

    // Auto-save after adding field
    this.saveFieldsToApi();
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

  toggleEditField(field: Field): void {
    if (this.editingFieldId === field.id && field.id !== undefined) {
      // Already editing this field, close it
      this.editingFieldId = null;
      this.editingField = null;
    } else {
      // Start editing this field
      this.editingFieldId = field.id !== undefined ? field.id : null;
      // Create a copy of the field for editing
      this.editingField = JSON.parse(JSON.stringify(field));
    }
  }

  saveEditedField(): void {
    if (!this.editingField || this.editingFieldId === null && this.editingFieldId !== 0 || !this.form.fields) {
      return;
    }

    // Find the field in the form and update it
    const fieldIndex = this.form.fields.findIndex(f => f.id === this.editingFieldId);
    if (fieldIndex !== -1) {
      // Update the field with edited values
      this.form.fields[fieldIndex] = { ...this.editingField };

      // Close the editing accordion
      this.editingFieldId = null;
      this.editingField = null;

      // Auto-save after editing field
      this.saveFieldsToApi();
    }
  }

  cancelEditField(): void {
    this.editingFieldId = null;
    this.editingField = null;
  }

  isEditingField(field: Field): boolean {
    return this.editingFieldId !== null && this.editingFieldId === field.id;
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
        this.$stateParams.eventId,
        this.localStorageService.getToken()
      );
    });
  }

}

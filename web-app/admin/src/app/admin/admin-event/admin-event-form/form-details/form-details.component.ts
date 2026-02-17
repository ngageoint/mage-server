import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';

import { AdminEventsService } from '../../../services/admin-events.service';
import { AdminUserService } from '../../../services/admin-user.service';
import { LocalStorageService } from '../../../../../../../../web-app/src/app/http/local-storage.service';

import { Event as MageEvent } from '../../../../../../../src/app/filter/filter.types';
import { AdminBreadcrumb } from '../../../admin-breadcrumb/admin-breadcrumb.model';
import {
  ObservationFeedHelper,
  Observation,
  Field
} from '../../helpers/observation-feed-helper';
import {
  FieldDialogComponent,
  FieldDialogData
} from './field-dialog/field-dialog.component';
import {
  SymbologyDialogComponent,
  SymbologyDialogData
} from './symbology-dialog/symbology-dialog.component';
import {
  decorateFormForDisplay,
  deriveUserFieldNames,
  prepareFormPayload,
  isUserFieldType
} from '../../helpers/form-field-utils';

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

  editingDetails = false;
  formEditForm = {
    name: '',
    description: '',
    color: '',
    default: false
  };

  showFieldsSection = false;
  showMapSection = false;
  showFeedSection = false;
  showSymbologyDetails = true;

  fieldsChanged = false;
  mapChanged = false;
  feedsChanged = false;
  savingFields = false;
  savingMap = false;
  savingFeeds = false;

  newField: Field = {};
  observations: Observation[] = [];
  fieldTypes = [
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
    { name: 'userDropdown', title: 'User Select' },
    { name: 'hidden', title: 'Hidden' }
  ];

  attachmentAllowedTypes = [
    { name: 'image', title: 'Image' },
    { name: 'video', title: 'Video' },
    { name: 'audio', title: 'Audio' }
  ];

  private iconCache: any = {};
  private pendingIconUploads: Array<{
    primary: string;
    file: File;
    variant?: string;
    previewUrl: string;
  }> = [];

  eventId: string | null = null;
  formId: string | null = null;

  fieldsRoute: any[] | null = null;
  mapRoute: any[] | null = null;
  feedRoute: any[] | null = null;

  constructor(
    private route: ActivatedRoute,
    private eventsService: AdminEventsService,
    private adminUserService: AdminUserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private localStorageService: LocalStorageService
  ) { }

  ngOnInit(): void {
    this.token = this.localStorageService.getToken() ?? null;

    this.eventId = this.route.snapshot.paramMap.get('eventId');
    this.formId = this.route.snapshot.paramMap.get('formId');

    this.newField = {
      type: 'textfield',
      required: false
    };

    if (!this.eventId) return;

    this.eventsService.getEventById(this.eventId).subscribe({
      next: (event) => {
        this.event = event;

        this.breadcrumbs = [
          {
            title: 'Events',
            iconClass: 'fa fa-calendar',
            route: ['../../../']
          },
          {
            title: event.name,
            route: ['../../../', String(event?.id ?? '')]
          },
          {
            title: this.formId ? 'Edit Form' : 'New Form'
          }
        ];

        if (this.formId && event.forms) {
          const existingForm = event.forms.find(
            (f) => f.id?.toString() === this.formId
          );
          if (existingForm) {
            this.form = { ...existingForm };
            if (!this.form.fields) this.form.fields = [];
            if (!this.form.userFields) this.form.userFields = [];
            this.breadcrumbs[2].title = existingForm.name || 'Edit Form';
          }
        } else {
          this.form = {
            archived: false,
            color:
              '#' +
              ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0'),
            fields: [],
            userFields: []
          };
        }

        decorateFormForDisplay(this.form as FormData);

        if (this.event?.id && this.form.id) {
          this.fieldsRoute = ['/admin/events', this.event.id, 'forms', this.form.id, 'fields'];
          this.mapRoute = ['/admin/events', this.event.id, 'forms', this.form.id, 'map'];
          this.feedRoute = ['/admin/events', this.event.id, 'forms', this.form.id, 'feed'];
        } else {
          this.fieldsRoute = null;
          this.mapRoute = null;
          this.feedRoute = null;
        }

        if (this.form.id) {
          this.generateSampleObservations();
          this.fetchFormIcons();
        }
      },
      error: (error) => {
        console.error('Error loading event:', error);
        this.snackBar.open('Error loading event', 'Close', {
          duration: 3000
        });
      }
    });
  }

  fetchFormIcons(): void {
    if (!this.event?.id || !this.form.id || !this.token) return;

    const url = `/api/events/${this.event.id}/icons/${this.form.id}.json?access_token=${this.token}`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          return [];
        }
        return response.json();
      })
      .then((icons: any[]) => {
        icons.forEach((iconData) => {
          if (iconData.primary && iconData.variant) {
            if (!this.iconCache[iconData.primary]) {
              this.iconCache[iconData.primary] = {};
            }
            this.iconCache[iconData.primary][iconData.variant] = iconData.icon;
          } else if (iconData.primary) {
            this.iconCache[iconData.primary] = {
              ...this.iconCache[iconData.primary],
              icon: iconData.icon
            };
          } else {
            this.iconCache.icon = iconData.icon;
          }
        });
      })
      .catch((error) => {
        console.error('Error fetching icons:', error);
      });
  }

  onFormChange(): void {
    this.formDirty = true;
  }

  toggleEditDetails(): void {
    if (!this.editingDetails) {
      this.formEditForm.name = this.form.name || '';
      this.formEditForm.description = this.form.description || '';
      this.formEditForm.color = this.form.color || '';
      this.formEditForm.default = this.form.default || false;
    }
    this.editingDetails = !this.editingDetails;
  }

  saveFormDetails(): void {
    if (!this.event?.id || !this.form.id) {
      return;
    }

    const overrides: Partial<FormData> = {
      name: this.formEditForm.name,
      description: this.formEditForm.description,
      color: this.formEditForm.color,
      default: this.formEditForm.default
    };

    const payload = prepareFormPayload<FormData>(
      this.form as FormData,
      overrides
    );

    this.eventsService
      .updateForm(this.event.id.toString(), this.form.id.toString(), payload)
      .subscribe({
        next: (savedForm) => {
          Object.assign(this.form, savedForm);
          decorateFormForDisplay(this.form as FormData);
          this.editingDetails = false;
          this.snackBar.open('Form details updated successfully', 'Close', {
            duration: 3000
          });
        },
        error: (response) => {
          const data = response.error || {};
          this.showError({
            title: 'Error Updating Form',
            message: data.errors
              ? 'If the problem persists please contact your MAGE administrator for help.'
              : 'Please try again later, if the problem persists please contact your MAGE administrator for help.',
            errors: data.errors
          });
        }
      });
  }

  cancelEditDetails(): void {
    this.editingDetails = false;
    this.formEditForm.name = this.form.name || '';
    this.formEditForm.description = this.form.description || '';
    this.formEditForm.color = this.form.color || '';
    this.formEditForm.default = this.form.default || false;
  }

  validateForm(): boolean {
    this.generalFormSubmitted = true;
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

    const payload = prepareFormPayload<FormData>(this.form as FormData);

    const saveObservable = this.form.id
      ? this.eventsService.updateForm(
        this.event.id.toString(),
        this.form.id.toString(),
        payload
      )
      : this.eventsService.createForm(this.event.id.toString(), payload);

    saveObservable.subscribe({
      next: (savedForm) => {
        this.saving = false;
        this.formDirty = false;
        this.generalFormSubmitted = false;
        Object.assign(this.form, savedForm);
        decorateFormForDisplay(this.form as FormData);
        this.snackBar.open('Form saved successfully', 'Close', {
          duration: 3000
        });
      },
      error: (response) => {
        this.saving = false;
        const data = response.error || {};
        this.showError({
          title: 'Error Saving Form',
          message: data.errors
            ? 'If the problem persists please contact your MAGE administrator for help.'
            : 'Please try again later, if the problem persists please contact your MAGE administrator for help.',
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
    this.form.userFields = deriveUserFieldNames(this.form.fields);

    const currentPrimaryField = this.form.primaryField;
    const currentVariantField = this.form.variantField;
    const currentPrimaryFeedField = this.form.primaryFeedField;
    const currentSecondaryFeedField = this.form.secondaryFeedField;

    const payload = prepareFormPayload<FormData>(this.form as FormData);

    this.eventsService
      .updateForm(this.event.id.toString(), this.form.id.toString(), payload)
      .subscribe({
        next: (savedForm) => {
          this.savingFields = false;
          this.fieldsChanged = false;
          Object.assign(this.form, savedForm);
          decorateFormForDisplay(this.form as FormData);
          if (savedForm.primaryField === undefined)
            this.form.primaryField = currentPrimaryField;
          if (savedForm.variantField === undefined)
            this.form.variantField = currentVariantField;
          if (savedForm.primaryFeedField === undefined)
            this.form.primaryFeedField = currentPrimaryFeedField;
          if (savedForm.secondaryFeedField === undefined)
            this.form.secondaryFeedField = currentSecondaryFeedField;
          this.snackBar.open('Fields saved successfully', 'Close', {
            duration: 3000
          });
        },
        error: (response) => {
          this.savingFields = false;
          const data = response.error || {};
          this.showError({
            title: 'Error Saving Fields',
            message: data.errors
              ? 'If the problem persists please contact your MAGE administrator for help.'
              : 'Please try again later, if the problem persists please contact your MAGE administrator for help.',
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

    this.form.userFields = deriveUserFieldNames(this.form.fields);
    const payload = prepareFormPayload<FormData>(this.form as FormData);

    this.eventsService
      .updateForm(this.event.id.toString(), this.form.id.toString(), payload)
      .subscribe({
        next: () => {
          decorateFormForDisplay(this.form as FormData);

          if (this.pendingIconUploads.length > 0) {
            this.uploadPendingIcons();
          } else {
            this.savingMap = false;
            this.mapChanged = false;
            this.snackBar.open(
              'Map configuration saved successfully',
              'Close',
              { duration: 3000 }
            );
          }
        },
        error: (response) => {
          this.savingMap = false;
          const data = response.error || {};
          this.showError({
            title: 'Error Saving Map Configuration',
            message: data.errors
              ? 'If the problem persists please contact your MAGE administrator for help.'
              : 'Please try again later, if the problem persists please contact your MAGE administrator for help.',
            errors: data.errors
          });
        }
      });
  }

  private uploadPendingIcons(): void {
    const uploads = [...this.pendingIconUploads];
    this.pendingIconUploads = [];

    const uploadPromises = uploads.map((upload) =>
      this.uploadIcon(upload.primary, upload.file, upload.variant)
    );

    Promise.allSettled(uploadPromises).then((results) => {
      const hasError = results.some((result) => result.status === 'rejected');

      this.savingMap = false;
      this.mapChanged = false;

      if (hasError) {
        this.snackBar.open(
          'Map configuration saved with some icon upload errors',
          'Close',
          { duration: 3000 }
        );
      } else {
        this.snackBar.open('Map configuration saved successfully', 'Close', {
          duration: 3000
        });
      }
    });
  }

  saveFeeds(): void {
    if (!this.event?.id || !this.form.id) {
      return;
    }

    this.savingFeeds = true;
    this.form.userFields = deriveUserFieldNames(this.form.fields);
    const payload = prepareFormPayload<FormData>(this.form as FormData);

    this.eventsService
      .updateForm(this.event.id.toString(), this.form.id.toString(), payload)
      .subscribe({
        next: () => {
          this.savingFeeds = false;
          this.feedsChanged = false;
          decorateFormForDisplay(this.form as FormData);
          this.snackBar.open('Feed configuration saved successfully', 'Close', {
            duration: 3000
          });
        },
        error: (response) => {
          this.savingFeeds = false;
          const data = response.error || {};
          this.showError({
            title: 'Error Saving Feed Configuration',
            message: data.errors
              ? 'If the problem persists please contact your MAGE administrator for help.'
              : 'Please try again later, if the problem persists please contact your MAGE administrator for help.',
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
    const payload = prepareFormPayload<FormData>(this.form as FormData, {
      archived: true
    });

    this.eventsService
      .updateForm(this.event.id.toString(), this.form.id.toString(), payload)
      .subscribe({
        next: (savedForm) => {
          if (savedForm) {
            Object.assign(this.form, savedForm);
            decorateFormForDisplay(this.form as FormData);
          }
          this.snackBar.open('Form archived successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error archiving form:', error);
          this.snackBar.open('Error archiving form', 'Close', {
            duration: 3000
          });
        }
      });
  }

  restoreForm(): void {
    if (!this.event?.id || !this.form.id) {
      return;
    }

    this.form.archived = false;
    const payload = prepareFormPayload<FormData>(this.form as FormData, {
      archived: false
    });

    this.eventsService
      .updateForm(this.event.id.toString(), this.form.id.toString(), payload)
      .subscribe({
        next: (savedForm) => {
          if (savedForm) {
            Object.assign(this.form, savedForm);
            decorateFormForDisplay(this.form as FormData);
          }
          this.snackBar.open('Form restored successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error restoring form:', error);
          this.snackBar.open('Error restoring form', 'Close', {
            duration: 3000
          });
        }
      });
  }

  showError(error: ErrorDialogData): void {
    const errorMessage = error.title + ': ' + error.message;
    this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
  }

  exportForm(): void {
    if (!this.event?.id || !this.form.id || !this.token) {
      return;
    }

    const url = `/api/events/${this.event.id}/${this.form.id}/form.zip?access_token=${this.token}`;
    const fileName = `${this.form.name || 'form'}.zip`;

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    this.snackBar.open('Exporting form...', 'Close', { duration: 2000 });
  }

  onFieldsChange(fields: Field[]): void {
    this.form.fields = fields;
    this.form.userFields = deriveUserFieldNames(this.form.fields);
    this.fieldsChanged = true;
    this.saveFieldsToApi();
  }

  getActiveFields(): Field[] {
    if (!this.form.fields) return [];
    return this.form.fields
      .filter((field) => !field.archived)
      .sort((a, b) => (a.id || 0) - (b.id || 0));
  }

  getFieldTypeLabel(type: string): string {
    const fieldType = this.fieldTypes.find((ft) => ft.name === type);
    return fieldType ? fieldType.title : type;
  }

  showAddOptions(field: Field): boolean {
    return (
      field.type === 'radio' ||
      field.type === 'dropdown' ||
      field.type === 'multiselectdropdown'
    );
  }

  isMemberField(field: Field): boolean {
    const name = field.name || '';
    return (
      isUserFieldType(field) ||
      (name ? this.form.userFields?.includes(name) : false) ||
      false
    );
  }

  isUserDropdown(field: Field): boolean {
    return isUserFieldType(field);
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
    const maxId =
      fields.length > 0 ? Math.max(...fields.map((f) => f.id || 0)) : -1;
    const newId = maxId + 1;

    const field: Field = {
      ...fieldData,
      id: newId,
      name: `field${newId}`,
      archived: false
    };

    if (!field.choices && this.showAddOptions(field)) {
      field.choices = [];
    }

    fields.push(field);
    this.form.userFields = deriveUserFieldNames(this.form.fields);
    this.saveFieldsToApi();
  }

  getAttachmentTypesDisplay(field: Field): string {
    if (
      !field.allowedAttachmentTypes ||
      field.allowedAttachmentTypes.length === 0
    ) {
      return 'All file types';
    }
    return field.allowedAttachmentTypes
      .map((typeName) => {
        const type = this.attachmentAllowedTypes.find(
          (t) => t.name === typeName
        );
        return type ? type.title : typeName;
      })
      .join(', ');
  }

  removeField(field: Field): void {
    if (field.id !== undefined) {
      const fieldToRemove = this.form.fields?.find((f) => f.id === field.id);
      if (fieldToRemove) {
        fieldToRemove.archived = true;
        this.form.userFields = deriveUserFieldNames(this.form.fields);
        this.saveFieldsToApi();
      }
    }
  }

  moveFieldUp(field: Field): void {
    if (!this.form.fields || !field.id) return;

    const sortedFields = this.getActiveFields();
    const currentIndex = sortedFields.findIndex((f) => f.id === field.id);

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
    const currentIndex = sortedFields.findIndex((f) => f.id === field.id);

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

    const activeFields = this.form.fields.filter((f) => !f.archived);
    const movedField = activeFields[event.previousIndex];
    activeFields.splice(event.previousIndex, 1);
    activeFields.splice(event.currentIndex, 0, movedField);

    activeFields.forEach((field, index) => {
      field.id = index;
    });

    const archivedFields = this.form.fields.filter((f) => f.archived);
    this.form.fields = [...activeFields, ...archivedFields];

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
        const fieldIndex = this.form.fields.findIndex((f) => f.id === field.id);
        if (fieldIndex !== -1) {
          this.form.fields[fieldIndex] = { ...editedField };
          this.form.userFields = deriveUserFieldNames(this.form.fields);
          this.saveFieldsToApi();
        }
      }
    });
  }

  getDropdownFields(excludeField?: string): Field[] {
    if (!this.form.fields) return [];
    return this.form.fields.filter(
      (field) =>
        (field.type === 'dropdown' || field.type === 'userDropdown') &&
        !field.multiselect &&
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
    const primaryField = this.form.fields.find(
      (f) => f.name === this.form.primaryField
    );
    return primaryField?.choices || [];
  }

  getVariantFieldChoices(): any[] {
    if (!this.form.variantField || !this.form.fields) return [];
    const variantField = this.form.fields.find(
      (f) => f.name === this.form.variantField
    );
    return variantField?.choices || [];
  }

  getIconUrl(primary: string, variant?: string): string | null {
    if (variant && this.iconCache[primary]?.[variant]) {
      return this.iconCache[primary][variant];
    } else if (this.iconCache[primary]?.icon) {
      return this.iconCache[primary].icon;
    } else if (this.iconCache.icon) {
      return this.iconCache.icon;
    }
    return null;
  }

  getLineColor(primary: string, variant?: string): string {
    if (!this.form.style) return '#3388ff';

    try {
      if (variant) {
        return this.form.style[primary]?.[variant]?.stroke || '#3388ff';
      }
      return this.form.style[primary]?.stroke || '#3388ff';
    } catch (e) {
      return '#3388ff';
    }
  }

  getFillColor(primary: string, variant?: string): string {
    if (!this.form.style) return '#3388ff';

    try {
      if (variant) {
        return this.form.style[primary]?.[variant]?.fill || '#3388ff';
      }
      return this.form.style[primary]?.fill || '#3388ff';
    } catch (e) {
      return '#3388ff';
    }
  }

  onFeedFieldChange(): void {
    this.feedsChanged = true;
    if (this.form.id) {
      this.generateSampleObservations();
    }
  }

  editSymbology(primary: string, variant?: string): void {
    const currentStyle = this.getStyleForChoice(primary, variant);
    const currentIcon = this.getIconUrl(primary, variant);

    const dialogData: SymbologyDialogData = {
      primary,
      variant,
      icon: currentIcon || undefined,
      style: currentStyle
    };

    const dialogRef = this.dialog.open(SymbologyDialogComponent, {
      width: '800px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateSymbology(primary, result.style, result.file, variant);
      }
    });
  }

  private getStyleForChoice(primary: string, variant?: string): any {
    if (!this.form.style) {
      return {
        stroke: '#3388ff',
        strokeOpacity: 1.0,
        strokeWidth: 2,
        fill: '#3388ff',
        fillOpacity: 0.2
      };
    }

    try {
      const defaultStyle = {
        stroke: '#3388ff',
        strokeOpacity: 1.0,
        strokeWidth: 2,
        fill: '#3388ff',
        fillOpacity: 0.2
      };

      if (variant) {
        const variantData = this.form.style[primary]?.[variant];
        if (variantData) {
          return {
            stroke: variantData.stroke || defaultStyle.stroke,
            strokeOpacity:
              variantData.strokeOpacity ?? defaultStyle.strokeOpacity,
            strokeWidth: variantData.strokeWidth ?? defaultStyle.strokeWidth,
            fill: variantData.fill || defaultStyle.fill,
            fillOpacity: variantData.fillOpacity ?? defaultStyle.fillOpacity
          };
        }
      } else {
        const primaryData = this.form.style[primary];
        if (primaryData) {
          return {
            stroke: primaryData.stroke || defaultStyle.stroke,
            strokeOpacity:
              primaryData.strokeOpacity ?? defaultStyle.strokeOpacity,
            strokeWidth: primaryData.strokeWidth ?? defaultStyle.strokeWidth,
            fill: primaryData.fill || defaultStyle.fill,
            fillOpacity: primaryData.fillOpacity ?? defaultStyle.fillOpacity
          };
        }
      }

      return defaultStyle;
    } catch (e) {
      return {
        stroke: '#3388ff',
        strokeOpacity: 1.0,
        strokeWidth: 2,
        fill: '#3388ff',
        fillOpacity: 0.2
      };
    }
  }

  private updateSymbology(
    primary: string,
    style: any,
    file?: File,
    variant?: string
  ): void {
    if (!this.form.style) {
      this.form.style = {};
    }

    if (variant) {
      if (!this.form.style[primary]) {
        this.form.style[primary] = {};
      }
      this.form.style[primary][variant] = {
        ...this.form.style[primary][variant],
        ...style
      };
    } else {
      this.form.style[primary] = {
        ...this.form.style[primary],
        ...style
      };
    }

    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const previewUrl = e.target.result;

        if (variant) {
          if (!this.iconCache[primary]) {
            this.iconCache[primary] = {};
          }
          this.iconCache[primary][variant] = previewUrl;
        } else {
          if (!this.iconCache[primary]) {
            this.iconCache[primary] = {};
          }
          this.iconCache[primary].icon = previewUrl;
        }

        this.iconCache = { ...this.iconCache };
      };
      reader.readAsDataURL(file);

      this.pendingIconUploads = this.pendingIconUploads.filter(
        (upload) => !(upload.primary === primary && upload.variant === variant)
      );

      this.pendingIconUploads.push({ primary, file, variant, previewUrl: '' });
    }

    this.mapChanged = true;
  }

  private uploadIcon(
    primary: string,
    file: File,
    variant?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.event?.id || !this.form.id) {
        reject(new Error('Missing event or form ID'));
        return;
      }

      const formData = new FormData();
      formData.append('icon', file);

      let url = `/api/events/${this.event.id}/icons/${this.form.id
        }/${encodeURIComponent(primary)}`;
      if (variant) {
        url += `/${encodeURIComponent(variant)}`;
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);

            if (response.icon) {
              if (variant) {
                if (!this.iconCache[primary]) {
                  this.iconCache[primary] = {};
                }
                this.iconCache[primary][variant] = response.icon;
              } else {
                if (!this.iconCache[primary]) {
                  this.iconCache[primary] = {};
                }
                this.iconCache[primary].icon = response.icon;
              }

              this.iconCache = { ...this.iconCache };
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.send(formData);
    });
  }

  getFieldTitle(fieldName: string | undefined): string {
    if (!fieldName || !this.form.fields) return '';
    const field = this.form.fields.find((f) => f.name === fieldName);
    return field?.title || fieldName;
  }

  async generateSampleObservations(): Promise<void> {
    try {
      const eventId = this.eventId;
      const token = this.localStorageService.getToken() ?? null;

      if (!eventId || !token) {
        this.observations = [];
        return;
      }

      const myself = await firstValueFrom(this.adminUserService.getMyself());

      this.observations = ObservationFeedHelper.generateSampleObservations(
        this.form,
        Number(this.form.id),
        myself,
        eventId,
        token
      );
    } catch (e) {
      console.error('Error generating sample observations:', e);
      this.observations = [];
    }
  }

}

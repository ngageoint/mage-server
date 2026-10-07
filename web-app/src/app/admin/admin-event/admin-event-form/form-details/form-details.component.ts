import { Component, DestroyRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { AdminEventsService } from '../../../services/admin-events.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { RouteReuse } from '../../../../route-reuse.strategy';

import { MageEvent } from 'mage-web-app/entities/event/entities.event';
import { AdminBreadcrumb } from '../../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../../admin-breadcrumb/admin-breadcrumb.service';
import {
  ObservationFeedHelper,
  Observation,
  Field
} from '../../helpers/observation-feed-helper';
import {
  SymbologyDialogComponent,
  SymbologyDialogData
} from './symbology-dialog/symbology-dialog.component';
import {
  EditFormDialogComponent,
  EditFormDialogData
} from './edit-form-dialog/edit-form-dialog.component';
import { FieldsListComponent } from '../fields-list/fields-list.component';
import {
  decorateFormForDisplay,
  deriveUserFieldNames,
  prepareFormPayload
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

interface ErrorDialogData {
  title: string;
  message: string;
  errors?: any;
}

@Component({
    selector: 'mage-form-details',
    templateUrl: './form-details.component.html',
    styleUrls: ['./form-details.component.scss'],
    imports: [
        FormsModule,
        DatePipe,
        MatStepperModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatSelectModule,
        MatTooltipModule,
        FieldsListComponent
    ]
})
export class FormDetailsComponent implements OnInit {
  static readonly routeReuse: RouteReuse = RouteReuse.RecreateOnParamChange;

  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly eventsService: AdminEventsService = inject(AdminEventsService);
  private readonly sessionService: SessionService = inject(SessionService);
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly breadcrumbService: AdminBreadcrumbService = inject(AdminBreadcrumbService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly eventId: string | null = this.route.snapshot.paramMap.get('eventId');
  readonly formId: string | null = this.route.snapshot.paramMap.get('formId');
  readonly creatingNewForm: boolean = !this.formId;
  readonly token: string | null = this.sessionService.getToken() ?? null;

  readonly event = signal<MageEvent | null>(null);
  readonly form = signal<FormData>({});
  readonly saving = signal(false);
  generalFormSubmitted = false;

  private _breadcrumbs: AdminBreadcrumb[] = [];
  set breadcrumbs(value: AdminBreadcrumb[]) {
    this._breadcrumbs = value;
    this.breadcrumbService.setBreadcrumbs(value);
  }
  get breadcrumbs(): AdminBreadcrumb[] {
    return this._breadcrumbs;
  }

  formStepper = viewChild<MatStepper>('formStepper');

  showFieldsSection = false;
  showMapSection = false;
  showFeedSection = false;
  readonly fieldsChanged = signal(false);
  readonly mapChanged = signal(false);
  readonly feedsChanged = signal(false);
  readonly savingFields = signal(false);
  readonly savingMap = signal(false);
  readonly savingFeeds = signal(false);

  readonly observations = signal<Observation[]>([]);
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
    { name: 'userDropdown', title: 'User Select' }
  ];

  attachmentAllowedTypes = [
    { name: 'image', title: 'Image' },
    { name: 'video', title: 'Video' },
    { name: 'audio', title: 'Audio' }
  ];

  private readonly iconCache = signal<any>({});
  private pendingIconUploads: Array<{
    primary: string;
    file: File;
    variant?: string;
    previewUrl: string;
  }> = [];

  ngOnInit(): void {
    this.breadcrumbs = [{
      title: 'Events',
      icon: 'event',
      route: ['/admin/events']
    }, {
      title: this.formId ? 'Edit Form' : 'New Form'
    }];

    if (!this.eventId) return;

    this.eventsService.getEventById(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          this.event.set(event);

          this.breadcrumbs = [{
            title: 'Events',
            icon: 'event',
            route: ['/admin/events']
          }, {
            title: event.name,
            route: ['/admin/events', String(event?.id ?? '')]
          }, {
            title: this.formId ? 'Edit Form' : 'New Form'
          }];

          if (this.formId && event.forms) {
            const existingForm = event.forms.find(
              (f) => f.id?.toString() === this.formId
            );
            if (existingForm) {
              const form: FormData = { ...existingForm };
              if (!form.fields) form.fields = [];
              if (!form.userFields) form.userFields = [];
              this.form.set(form);
              this.breadcrumbs[2].title = existingForm.name || 'Edit Form';
              this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
            }
          } else {
            this.form.set({
              archived: false,
              color:
                '#' +
                ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0'),
              fields: [],
              userFields: []
            });
          }

          decorateFormForDisplay(this.form());

          if (this.form().id) {
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
    const event = this.event();
    const form = this.form();
    if (!event?.id || !form.id || !this.token) return;

    const url = `/api/events/${event.id}/icons/${form.id}.json?access_token=${this.token}`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          return [];
        }
        return response.json();
      })
      .then((icons: any[]) => {
        this.iconCache.update((iconCache) => {
          const next = { ...iconCache };
          icons.forEach((iconData) => {
            if (iconData.primary && iconData.variant) {
              next[iconData.primary] = {
                ...next[iconData.primary],
                [iconData.variant]: iconData.icon
              };
            } else if (iconData.primary) {
              next[iconData.primary] = {
                ...next[iconData.primary],
                icon: iconData.icon
              };
            } else {
              next.icon = iconData.icon;
            }
          });
          return next;
        });
      })
      .catch((error) => {
        console.error('Error fetching icons:', error);
      });
  }

  openEditDialog(): void {
    const form = this.form();
    const dialogData: EditFormDialogData = {
      name: form.name || '',
      description: form.description || '',
      color: form.color || '',
      default: form.default || false
    };

    const dialogRef = this.dialog.open(EditFormDialogComponent, {
      width: 'auto',
      maxWidth: '95vw',
      autoFocus: false,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: EditFormDialogData | undefined) => {
      const event = this.event();
      const currentForm = this.form();
      if (!result || !event?.id || !currentForm.id) return;

      const payload = prepareFormPayload<FormData>(currentForm, {
        name: result.name,
        description: result.description,
        color: result.color,
        default: result.default
      });

      this.eventsService
        .updateForm(event.id.toString(), currentForm.id.toString(), payload)
        .subscribe({
          next: (savedForm) => {
            this.form.update((f) => decorateFormForDisplay({ ...f, ...savedForm }));
            this.snackBar.open('Form details updated successfully', 'Close', { duration: 3000 });
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
    });
  }

  validateForm(): boolean {
    this.generalFormSubmitted = true;
    const form = this.form();
    return Boolean(form.name && form.color);
  }

  goToFieldsStep(): void {
    if (!this.validateForm()) {
      return;
    }
    this.formStepper()?.next();
  }

  saveForm(): void {
    if (!this.validateForm()) {
      return;
    }

    const event = this.event();
    if (!event?.id) {
      return;
    }

    this.saving.set(true);
    const form = this.form();
    const wasNew = !form.id;

    const payload = prepareFormPayload<FormData>(form);

    const saveObservable = form.id
      ? this.eventsService.updateForm(
        event.id.toString(),
        form.id.toString(),
        payload
      )
      : this.eventsService.createForm(event.id.toString(), payload);

    saveObservable.subscribe({
      next: (savedForm) => {
        this.saving.set(false);
        this.generalFormSubmitted = false;
        this.form.update((f) => decorateFormForDisplay({ ...f, ...savedForm }));
        this.snackBar.open('Form saved successfully', 'Close', {
          duration: 3000
        });
        if (wasNew) {
          this.finishCreating();
        }
      },
      error: (response) => {
        this.saving.set(false);
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
    const event = this.event();
    const form = this.form();
    if (!event?.id || !form.id || this.savingFields()) {
      return;
    }

    this.savingFields.set(true);

    const userFields = deriveUserFieldNames(form.fields);
    this.form.update((f) => ({ ...f, userFields }));

    const currentPrimaryField = form.primaryField;
    const currentVariantField = form.variantField;
    const currentPrimaryFeedField = form.primaryFeedField;
    const currentSecondaryFeedField = form.secondaryFeedField;

    const payload = prepareFormPayload<FormData>({ ...form, userFields });

    this.eventsService
      .updateForm(event.id.toString(), form.id.toString(), payload)
      .subscribe({
        next: (savedForm) => {
          this.savingFields.set(false);
          this.fieldsChanged.set(false);
          this.form.update((f) => {
            const next = decorateFormForDisplay({ ...f, ...savedForm });
            if (savedForm.primaryField === undefined)
              next.primaryField = currentPrimaryField;
            if (savedForm.variantField === undefined)
              next.variantField = currentVariantField;
            if (savedForm.primaryFeedField === undefined)
              next.primaryFeedField = currentPrimaryFeedField;
            if (savedForm.secondaryFeedField === undefined)
              next.secondaryFeedField = currentSecondaryFeedField;
            return next;
          });
          this.snackBar.open('Fields saved successfully', 'Close', {
            duration: 3000
          });
        },
        error: (response) => {
          this.savingFields.set(false);
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
    const event = this.event();
    const form = this.form();
    if (!event?.id || !form.id) {
      return;
    }

    this.savingMap.set(true);

    const userFields = deriveUserFieldNames(form.fields);
    this.form.update((f) => ({ ...f, userFields }));
    const payload = prepareFormPayload<FormData>({ ...form, userFields });

    this.eventsService
      .updateForm(event.id.toString(), form.id.toString(), payload)
      .subscribe({
        next: () => {
          this.form.update((f) => decorateFormForDisplay({ ...f }));

          if (this.pendingIconUploads.length > 0) {
            this.uploadPendingIcons();
          } else {
            this.savingMap.set(false);
            this.mapChanged.set(false);
            this.snackBar.open(
              'Map configuration saved successfully',
              'Close',
              { duration: 3000 }
            );
          }
        },
        error: (response) => {
          this.savingMap.set(false);
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

      this.savingMap.set(false);
      this.mapChanged.set(false);

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
    const event = this.event();
    const form = this.form();
    if (!event?.id || !form.id) {
      return;
    }

    this.savingFeeds.set(true);
    const userFields = deriveUserFieldNames(form.fields);
    this.form.update((f) => ({ ...f, userFields }));
    const payload = prepareFormPayload<FormData>({ ...form, userFields });

    this.eventsService
      .updateForm(event.id.toString(), form.id.toString(), payload)
      .subscribe({
        next: () => {
          this.savingFeeds.set(false);
          this.feedsChanged.set(false);
          this.form.update((f) => decorateFormForDisplay({ ...f }));
          this.snackBar.open('Feed configuration saved successfully', 'Close', {
            duration: 3000
          });
        },
        error: (response) => {
          this.savingFeeds.set(false);
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
    const event = this.event();
    const form = this.form();
    if (!event?.id || !form.id) {
      return;
    }

    this.form.update((f) => ({ ...f, archived: true }));
    const payload = prepareFormPayload<FormData>(form, {
      archived: true
    });

    this.eventsService
      .updateForm(event.id.toString(), form.id.toString(), payload)
      .subscribe({
        next: (savedForm) => {
          if (savedForm) {
            this.form.update((f) => decorateFormForDisplay({ ...f, ...savedForm }));
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
    const event = this.event();
    const form = this.form();
    if (!event?.id || !form.id) {
      return;
    }

    this.form.update((f) => ({ ...f, archived: false }));
    const payload = prepareFormPayload<FormData>(form, {
      archived: false
    });

    this.eventsService
      .updateForm(event.id.toString(), form.id.toString(), payload)
      .subscribe({
        next: (savedForm) => {
          if (savedForm) {
            this.form.update((f) => decorateFormForDisplay({ ...f, ...savedForm }));
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

  finishCreating(): void {
    const event = this.event();
    const form = this.form();
    if (!event?.id || !form.id) {
      return;
    }

    this.router.navigate(['/admin/events', event.id, 'forms', form.id]);
  }

  exportForm(): void {
    const event = this.event();
    const form = this.form();
    if (!event?.id || !form.id || !this.token) {
      return;
    }

    const url = `/api/events/${event.id}/${form.id}/form.zip?access_token=${this.token}`;
    const fileName = `${form.name || 'form'}.zip`;

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
    const userFields = deriveUserFieldNames(fields);
    this.form.update((f) => ({ ...f, fields, userFields }));
    this.fieldsChanged.set(true);
    this.saveFieldsToApi();
  }

  getActiveFields(): Field[] {
    const fields = this.form().fields;
    if (!fields) return [];
    return fields
      .filter((field) => !field.archived)
      .sort((a, b) => (a.id || 0) - (b.id || 0));
  }

  getDropdownFields(excludeField?: string): Field[] {
    const fields = this.form().fields;
    if (!fields) return [];
    return fields.filter(
      (field) =>
        (field.type === 'dropdown' || field.type === 'userDropdown') &&
        !field.multiselect &&
        !field.archived &&
        field.name !== excludeField
    );
  }

  onMapFieldChange(): void {
    this.mapChanged.set(true);
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

  getPrimaryFieldChoices(): any[] {
    const form = this.form();
    if (!form.primaryField || !form.fields) return [];
    const primaryField = form.fields.find(
      (f) => f.name === form.primaryField
    );
    return primaryField?.choices || [];
  }

  getVariantFieldChoices(): any[] {
    const form = this.form();
    if (!form.variantField || !form.fields) return [];
    const variantField = form.fields.find(
      (f) => f.name === form.variantField
    );
    return variantField?.choices || [];
  }

  getIconUrl(primary: string, variant?: string): string | null {
    const iconCache = this.iconCache();
    if (variant && iconCache[primary]?.[variant]) {
      return iconCache[primary][variant];
    } else if (iconCache[primary]?.icon) {
      return iconCache[primary].icon;
    } else if (iconCache.icon) {
      return iconCache.icon;
    }
    return null;
  }

  getLineColor(primary: string, variant?: string): string {
    const style = this.form().style;
    if (!style) return '#3388ff';

    try {
      if (variant) {
        return style[primary]?.[variant]?.stroke || '#3388ff';
      }
      return style[primary]?.stroke || '#3388ff';
    } catch (e) {
      return '#3388ff';
    }
  }

  getFillColor(primary: string, variant?: string): string {
    const style = this.form().style;
    if (!style) return '#3388ff';

    try {
      if (variant) {
        return style[primary]?.[variant]?.fill || '#3388ff';
      }
      return style[primary]?.fill || '#3388ff';
    } catch (e) {
      return '#3388ff';
    }
  }

  onFeedFieldChange(): void {
    this.feedsChanged.set(true);
    if (this.form().id) {
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
      width: 'auto',
      maxWidth: '95vw',
      autoFocus: false,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateSymbology(primary, result.style, result.file, variant);
      }
    });
  }

  private getStyleForChoice(primary: string, variant?: string): any {
    const style = this.form().style;
    if (!style) {
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
        const variantData = style[primary]?.[variant];
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
        const primaryData = style[primary];
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
    this.form.update((f) => {
      const nextStyle: any = { ...(f.style || {}) };

      if (variant) {
        nextStyle[primary] = {
          ...nextStyle[primary],
          [variant]: {
            ...nextStyle[primary]?.[variant],
            ...style
          }
        };
      } else {
        nextStyle[primary] = {
          ...nextStyle[primary],
          ...style
        };
      }

      return { ...f, style: nextStyle };
    });

    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const previewUrl = e.target.result;

        this.iconCache.update((iconCache) => {
          const next = { ...iconCache };
          if (variant) {
            next[primary] = { ...next[primary], [variant]: previewUrl };
          } else {
            next[primary] = { ...next[primary], icon: previewUrl };
          }
          return next;
        });
      };
      reader.readAsDataURL(file);

      this.pendingIconUploads = this.pendingIconUploads.filter(
        (upload) => !(upload.primary === primary && upload.variant === variant)
      );

      this.pendingIconUploads.push({ primary, file, variant, previewUrl: '' });
    }

    this.mapChanged.set(true);
  }

  private uploadIcon(
    primary: string,
    file: File,
    variant?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const event = this.event();
      const form = this.form();
      if (!event?.id || !form.id) {
        reject(new Error('Missing event or form ID'));
        return;
      }

      const formData = new FormData();
      formData.append('icon', file);

      let url = `/api/events/${event.id}/icons/${form.id
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
              this.iconCache.update((iconCache) => {
                const next = { ...iconCache };
                if (variant) {
                  next[primary] = { ...next[primary], [variant]: response.icon };
                } else {
                  next[primary] = { ...next[primary], icon: response.icon };
                }
                return next;
              });
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
    const fields = this.form().fields;
    if (!fieldName || !fields) return '';
    const field = fields.find((f) => f.name === fieldName);
    return field?.title || fieldName;
  }

  getFeedFieldDisplayValue(fieldName: string | undefined, formData: any): string {
    if (!fieldName || !formData) return '';
    const value = formData[fieldName];
    if (value == null) return '';
    const field = this.form().fields?.find((f: any) => f.name === fieldName);
    if (field?.type === 'geometry' && value?.coordinates) {
      return `${value.coordinates[1].toFixed(5)}, ${value.coordinates[0].toFixed(5)}`;
    }
    return String(value);
  }

  async generateSampleObservations(): Promise<void> {
    try {
      const eventId = this.eventId;
      const token = this.sessionService.getToken() ?? null;

      if (!eventId || !token) {
        this.observations.set([]);
        return;
      }

      const myself = await firstValueFrom(this.sessionService.user$);
      const form = this.form();

      this.observations.set(
        ObservationFeedHelper.generateSampleObservations(
          form,
          Number(form.id),
          myself,
          eventId,
          token
        )
      );
    } catch (e) {
      console.error('Error generating sample observations:', e);
      this.observations.set([]);
    }
  }

}

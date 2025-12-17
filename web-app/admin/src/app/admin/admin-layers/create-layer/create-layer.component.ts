import { Component, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { LayersService, Layer } from '../layers.service';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, first } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

/**
 * Dialog component for creating new layers.
 * Provides a form interface with validation for layer name (required) and description (optional).
 */
@Component({
    selector: 'mage-admin-layer-create',
    templateUrl: './create-layer.component.html',
    styleUrls: ['./create-layer.component.scss']
})
export class CreateLayerDialogComponent implements AfterViewInit {
    layerForm: FormGroup;
    errorMessage: string = '';
    geopackageFile: File | null = null;
    geopackageFileName: string = '';
    wmsCapabilities: any = null;
    wmsError: string = '';
    wmsLayers: any[] = [];
    wmsOtherLayers: any[] = [];
    selectedWmsLayers: { [key: string]: boolean } = {};
    advancedOptionsExpanded: boolean = false;
    isLoadingWms: boolean = false;
    showPreview: boolean = false;
    previewMap: L.Map | null = null;
    previewMapLayer: L.Layer | null = null;
    showWmsCapabilitiesDocument: boolean = false;
    wmsLayerSearchQuery: string = '';

    @ViewChild('previewMapContainer') previewMapContainer: ElementRef;

    constructor(
        public dialogRef: MatDialogRef<CreateLayerDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { layer: Partial<Layer> },
        private fb: FormBuilder,
        private layersService: LayersService,
        private http: HttpClient
    ) {
        this.layerForm = this.fb.group({
            name: [
                data.layer?.name ?? '',
                [Validators.required],
                [this.duplicateLayerNameValidator()]
            ],
            type: [data.layer?.type ?? '', [Validators.required]],
            description: [data.layer?.description ?? ''],
            url: [''],
            format: ['XYZ'],
            base: [false],
            wmsVersion: ['1.3.0'],
            wmsTransparent: [true],
            wmsStyles: ['']
        });
    }
    ngAfterViewInit(): void {
        throw new Error('Method not implemented.');
    }

    /**
     * Async validator to check if a layer name already exists
     */
    private duplicateLayerNameValidator(): AsyncValidatorFn {
        return (control: AbstractControl): Observable<ValidationErrors | null> => {
            if (!control.value) {
                return of(null);
            }

            return this.layersService.getLayers().pipe(
                debounceTime(300),
                map(layers => {
                    const nameExists = layers.some(
                        layer => layer.name?.toLowerCase() === control.value.toLowerCase()
                    );
                    return nameExists ? { duplicateName: true } : null;
                }),
                catchError(() => of(null)),
                first()
            );
        };
    }

    /**
     * Handles layer type change to add/remove validators and reset fields
     */
    onTypeChange(): void {
        const type = this.layerForm.get('type')?.value;
        const urlControl = this.layerForm.get('url');
        const formatControl = this.layerForm.get('format');
        const baseControl = this.layerForm.get('base');

        urlControl?.clearValidators();
        urlControl?.setValue('');
        formatControl?.setValue('XYZ');
        baseControl?.setValue(false);
        this.geopackageFile = null;
        this.geopackageFileName = '';
        this.wmsCapabilities = null;
        this.wmsError = '';
        this.wmsLayers = [];
        this.wmsOtherLayers = [];
        this.selectedWmsLayers = {};

        if (type === 'Imagery') {
            urlControl?.setValidators([Validators.required]);
        }

        urlControl?.updateValueAndValidity();
    }

    /**
     * Handles GeoPackage file selection
     */
    onGeoPackageFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length > 0) {
            this.geopackageFile = input.files[0];
            this.geopackageFileName = this.geopackageFile.name;
        }
    }

    /**
     * Handles format change to fetch WMS capabilities when WMS is selected
     */
    onFormatChange(): void {
        const format = this.layerForm.get('format')?.value;
        const url = this.layerForm.get('url')?.value;

        if (format === 'WMS' && url) {
            this.fetchWmsCapabilities();
        } else {
            this.wmsCapabilities = null;
            this.wmsError = '';
            this.wmsLayers = [];
            this.wmsOtherLayers = [];
            this.selectedWmsLayers = {};
        }
    }

    /**
     * Fetches WMS GetCapabilities document from the server
     */
    fetchWmsCapabilities(): void {
        const url = this.layerForm.get('url')?.value;
        if (!url) {
            this.wmsError = 'Please enter a WMS URL first';
            return;
        }

        this.isLoadingWms = true;
        this.wmsError = '';
        this.wmsCapabilities = null;
        this.wmsLayers = [];
        this.wmsOtherLayers = [];
        this.selectedWmsLayers = {};

        const baseUrl = url.split('?')[0];
        this.http.post<any>('/api/layers/wms/getcapabilities', { url: baseUrl }).subscribe({
            next: (response) => {
                this.isLoadingWms = false;
                if (response?.Capability) {
                    this.wmsCapabilities = response;
                    this.parseWmsLayers(response.Capability.Layer, this.wmsLayers, this.wmsOtherLayers);
                    this.layerForm.patchValue({ wmsVersion: response.version || '1.3.0' });

                    if (this.wmsLayers.length === 0 && this.wmsOtherLayers.length === 0) {
                        this.wmsError = 'No layers found in WMS Capabilities document.';
                    }
                } else {
                    this.wmsError = 'Invalid response received from WMS Server, please check your URL and try again.';
                }
            },
            error: (error) => {
                this.isLoadingWms = false;
                let errorMessage = 'Failed to load WMS Capabilities document.';

                if (error.error) {
                    if (typeof error.error === 'string') {
                        errorMessage = error.error;
                    } else if (error.error.message) {
                        errorMessage = error.error.message;
                    }
                }

                this.wmsError = errorMessage;
            }
        });
    }

    /**
     * Parses WMS layers from capabilities document
     */
    private parseWmsLayers(layer: any, layers: any[], otherLayers: any[], layerHierarchy?: string): void {
        const all = Array.isArray(layer) ? layer : [layer];
        all.forEach(l => {
            if (l.Name) {
                l.Title = layerHierarchy ? `${layerHierarchy} - ${l.Title}` : l.Title;
                if (this.checkWmsLayer(l)) {
                    layers.push(l);
                } else {
                    otherLayers.push(l);
                }
            }

            if (l.Layer) {
                this.parseWmsLayers(l.Layer, layers, otherLayers, l.Title);
            }
        });
    }

    /**
     * Checks if layer supports EPSG:3857
     */
    private checkWmsLayer(layer: any): boolean {
        if (layer.CRS) {
            return layer.CRS.some((crs: string) =>
                crs.indexOf('EPSG:3857') !== -1 || crs.indexOf('EPSG:900913') !== -1
            );
        }
        return false;
    }

    /**
     * Toggles advanced options visibility
     */
    toggleAdvancedOptions(): void {
        this.advancedOptionsExpanded = !this.advancedOptionsExpanded;
    }

    /**
     * Toggles WMS capabilities document visibility
     */
    toggleWmsCapabilitiesDocument(): void {
        this.showWmsCapabilitiesDocument = !this.showWmsCapabilitiesDocument;
    }

    /**
     * Opens preview map
     */
    openPreview(): void {
        try {
            this.showPreview = true;
            setTimeout(() => {
                this.initializePreviewMap();
                this.updatePreviewMap();
            }, 100);
        } catch (error) {
            console.error('Error opening preview:', error);
            this.errorMessage = 'Failed to open preview map. Please try again.';
            this.showPreview = false;
            setTimeout(() => this.errorMessage = '', 3000);
        }
    }

    /**
     * Closes preview map
     */
    closePreview(): void {
        this.showPreview = false;
        if (this.previewMap) {
            this.previewMap.remove();
            this.previewMap = null;
            this.previewMapLayer = null;
        }
    }

    /**
     * Initializes the Leaflet preview map
     */
    private initializePreviewMap(): void {
        if (!this.previewMapContainer || this.previewMap) return;

        this.previewMap = L.map(this.previewMapContainer.nativeElement, {
            center: [0, 0],
            zoom: 3,
            minZoom: 0,
            maxZoom: 18,
            zoomControl: true,
            trackResize: true,
            scrollWheelZoom: true,
            attributionControl: true,
            worldCopyJump: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(this.previewMap);
    }

    /**
     * Updates the preview map with the current layer configuration
     */
    private updatePreviewMap(): void {
        if (!this.previewMap) return;

        try {
            if (this.previewMapLayer) {
                this.previewMap.removeLayer(this.previewMapLayer);
                this.previewMapLayer = null;
            }

            const formValue = this.layerForm.value;
            const url = formValue.url;
            const format = formValue.format;

            if (!url || !format) return;

            if (format === 'XYZ' || format === 'TMS') {
                this.previewMapLayer = L.tileLayer(url, {
                    tms: format === 'TMS',
                    maxZoom: 18,
                    errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                }).addTo(this.previewMap);
            } else if (format === 'WMS') {
                const selectedLayers = this.getSelectedWmsLayers();
                if (!selectedLayers) return;

                const wmsOptions: any = {
                    layers: selectedLayers,
                    version: formValue.wmsVersion || '1.3.0',
                    format: formValue.wmsTransparent ? 'image/png' : 'image/jpeg',
                    transparent: formValue.wmsTransparent
                };

                if (formValue.wmsStyles) {
                    wmsOptions.styles = formValue.wmsStyles;
                }

                this.previewMapLayer = L.tileLayer.wms(url, wmsOptions).addTo(this.previewMap);

                const firstSelectedLayer = this.wmsLayers.find(l => this.selectedWmsLayers[l.Name]);
                if (firstSelectedLayer?.EX_GeographicBoundingBox) {
                    const extent = firstSelectedLayer.EX_GeographicBoundingBox;
                    const bounds = L.latLngBounds(
                        [extent[1], extent[0]],
                        [extent[3], extent[2]]
                    );
                    this.previewMap.fitBounds(bounds);
                }
            }

            setTimeout(() => {
                if (this.previewMap) {
                    this.previewMap.invalidateSize();
                }
            }, 100);
        } catch (error) {
            console.error('Error updating preview map:', error);
            this.errorMessage = 'Failed to load layer in preview. Please check your configuration.';
            setTimeout(() => this.errorMessage = '', 3000);
        }
    }

    /**
     * Filters WMS layers based on search query
     */
    filteredWmsLayers(): any[] {
        if (!this.wmsLayerSearchQuery || this.wmsLayerSearchQuery.trim() === '') {
            return this.wmsLayers;
        }

        const query = this.wmsLayerSearchQuery.toLowerCase();
        return this.wmsLayers.filter(layer =>
            layer.Title?.toLowerCase().includes(query) ||
            layer.Name?.toLowerCase().includes(query) ||
            layer.Abstract?.toLowerCase().includes(query)
        );
    }

    /**
     * Filters unavailable WMS layers based on search query
     */
    filteredWmsOtherLayers(): any[] {
        if (!this.wmsLayerSearchQuery || this.wmsLayerSearchQuery.trim() === '') {
            return this.wmsOtherLayers;
        }

        const query = this.wmsLayerSearchQuery.toLowerCase();
        return this.wmsOtherLayers.filter(layer =>
            layer.Title?.toLowerCase().includes(query) ||
            layer.Name?.toLowerCase().includes(query) ||
            layer.Abstract?.toLowerCase().includes(query)
        );
    }

    /**
     * Gets selected WMS layer names as comma-separated string
     */
    getSelectedWmsLayers(): string {
        return Object.keys(this.selectedWmsLayers)
            .filter(name => this.selectedWmsLayers[name])
            .join(',');
    }

    /**
     * Handles form submission for creating a new layer.
     * Validates the form, creates the layer via the layers service, and closes the dialog on success.
     */
    save(): void {
        if (this.layerForm.invalid) {
            this.errorMessage = 'Please fill in all required fields.';
            return;
        }

        if (this.layerForm.get('type')?.value === 'GeoPackage' && !this.geopackageFile) {
            this.errorMessage = 'Please select a GeoPackage file.';
            return;
        }

        this.errorMessage = '';
        const formValue = this.layerForm.value;

        let layerData: any;

        if (formValue.type === 'GeoPackage' && this.geopackageFile) {
            const formData = new FormData();
            formData.append('name', formValue.name);
            formData.append('type', formValue.type);
            if (formValue.description) {
                formData.append('description', formValue.description);
            }
            formData.append('geopackage', this.geopackageFile);
            layerData = formData;
        } else {
            layerData = {
                name: formValue.name,
                type: formValue.type,
                description: formValue.description
            };

            if (formValue.type === 'Imagery') {
                layerData.url = formValue.url;
                layerData.format = formValue.format;
                layerData.base = formValue.base;

                if (formValue.format === 'WMS') {
                    const selectedLayers = this.getSelectedWmsLayers();

                    layerData.wms = {
                        layers: selectedLayers || '',
                        version: formValue.wmsVersion,
                        transparent: formValue.wmsTransparent,
                        format: formValue.wmsTransparent ? 'image/png' : 'image/jpeg',
                        styles: formValue.wmsStyles || ''
                    };
                }
            }
        }

        this.layersService.createLayer(layerData).subscribe({
            next: (newLayer) => {
                this.dialogRef.close(newLayer);
            },
            error: ({ status, error }) => {
                if (status === 400 && error?.errors) {
                    const fieldErrors = error.errors;
                    if (fieldErrors.name?.type === 'unique') {
                        this.errorMessage = fieldErrors.name.message;
                    } else {
                        this.errorMessage = error.message ?? 'Validation failed';
                    }
                } else if (status === 409) {
                    this.errorMessage = error;
                } else {
                    this.errorMessage = 'Failed to create layer. Please try again.';
                }
            }
        });
    }

    /**
     * Checks if the save button should be disabled
     */
    get canSave(): boolean {
        const nameControl = this.layerForm.get('name');
        const typeControl = this.layerForm.get('type');

        if (!nameControl?.value || !typeControl?.value) {
            return true;
        }
        if (typeControl.value === 'GeoPackage' && !this.geopackageFile) {
            return true;
        }

        return this.layerForm.invalid;
    }

    /**
     * Closes the dialog without saving any data or making any changes.
     */
    cancel(): void {
        this.dialogRef.close();
    }
}

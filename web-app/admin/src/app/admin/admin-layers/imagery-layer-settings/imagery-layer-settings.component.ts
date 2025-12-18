import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

export interface ImageryLayerConfig {
    url: string;
    format: string;
    wmsVersion?: string;
    wmsTransparent?: boolean;
    wmsStyles?: string;
}

@Component({
    selector: 'mage-imagery-layer-settings',
    templateUrl: './imagery-layer-settings.component.html',
    styleUrls: ['./imagery-layer-settings.component.scss']
})
export class ImageryLayerSettingsComponent implements OnChanges {
    @Input() config: ImageryLayerConfig = {
        url: '',
        format: 'XYZ',
        wmsVersion: '1.3.0',
        wmsTransparent: true,
        wmsStyles: ''
    };

    @Input() existingWmsLayers?: string;
    @Output() configChange = new EventEmitter<ImageryLayerConfig>();
    @Output() wmsLayersSelected = new EventEmitter<string>();

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

    constructor(private http: HttpClient) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['existingWmsLayers'] && this.existingWmsLayers) {
            const layers = this.existingWmsLayers.split(',');
            layers.forEach(layerName => {
                this.selectedWmsLayers[layerName.trim()] = true;
            });
        }
    }

    onConfigChange(): void {
        this.configChange.emit(this.config);
    }

    onFormatChange(): void {
        if (this.config.format === 'WMS' && this.config.url) {
            this.fetchWmsCapabilities();
        } else {
            this.resetWmsData();
        }
        this.onConfigChange();
    }

    private resetWmsData(): void {
        this.wmsCapabilities = null;
        this.wmsError = '';
        this.wmsLayers = [];
        this.wmsOtherLayers = [];
        this.selectedWmsLayers = {};
    }

    /**
     * Fetches WMS GetCapabilities document from the server
     */
    fetchWmsCapabilities(): void {
        if (!this.config.url) {
            this.wmsError = 'Please enter a WMS URL first';
            return;
        }

        this.isLoadingWms = true;
        this.wmsError = '';
        this.wmsCapabilities = null;
        this.wmsLayers = [];
        this.wmsOtherLayers = [];
        this.selectedWmsLayers = {};

        const baseUrl = this.config.url.split('?')[0];
        this.http.post<any>('/api/layers/wms/getcapabilities', { url: baseUrl }).subscribe({
            next: (response) => {
                this.isLoadingWms = false;
                if (response?.Capability) {
                    this.wmsCapabilities = response;
                    this.parseWmsLayers(response.Capability.Layer, this.wmsLayers, this.wmsOtherLayers);
                    this.config.wmsVersion = response.version || '1.3.0';

                    if (this.existingWmsLayers) {
                        const layers = this.existingWmsLayers.split(',');
                        layers.forEach(layerName => {
                            const trimmedName = layerName.trim();
                            if (this.wmsLayers.find(l => l.Name === trimmedName)) {
                                this.selectedWmsLayers[trimmedName] = true;
                            }
                        });
                    }

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

    onWmsLayerSelectionChange(): void {
        const selectedLayers = this.getSelectedWmsLayers();
        this.wmsLayersSelected.emit(selectedLayers);
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
            this.showPreview = false;
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

            const url = this.config.url;
            const format = this.config.format;

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
                    version: this.config.wmsVersion || '1.3.0',
                    format: this.config.wmsTransparent ? 'image/png' : 'image/jpeg',
                    transparent: this.config.wmsTransparent
                };

                if (this.config.wmsStyles) {
                    wmsOptions.styles = this.config.wmsStyles;
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
}

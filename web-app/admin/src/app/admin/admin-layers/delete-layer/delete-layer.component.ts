import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LayersService, Layer } from '../layers.service';

/**
 * Modal component for confirming layer deletion.
 * Provides a confirmation dialog before permanently deleting a layer.
 */
@Component({
    selector: 'mage-delete-layer',
    templateUrl: './delete-layer.component.html',
    styleUrls: ['./delete-layer.component.scss']
})
export class DeleteLayerComponent {
    layer: Layer;
    deleting = false;
    error: string | null = null;

    /**
     * Constructor - initializes the component with injected services and layer data.
     * @param dialogRef - Reference to the dialog for closing and returning results
     * @param data - Injected data containing the layer to delete
     * @param layersService - Service for layer operations
     */
    constructor(
        public dialogRef: MatDialogRef<DeleteLayerComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { layer: Layer },
        private layersService: LayersService
    ) {
        this.layer = data.layer;
    }

    /**
     * Deletes the layer after confirmation.
     */
    deleteLayer(): void {
        this.deleting = true;
        this.error = null;

        this.layersService.deleteLayer(this.layer).subscribe({
            next: () => {
                this.dialogRef.close(this.layer);
            },
            error: (error) => {
                console.error('Error deleting layer:', error);
                this.deleting = false;

                if (error.error?.message) {
                    this.error = error.error.message;
                } else if (error.statusText && error.status) {
                    this.error = `Error ${error.status}: ${error.statusText}`;
                } else if (error.message) {
                    this.error = error.message;
                } else {
                    this.error = 'Failed to delete layer. Please try again.';
                }
            }
        });
    }

    /**
     * Cancels the deletion and closes the dialog without any action.
     */
    cancel(): void {
        this.dialogRef.close();
    }
}

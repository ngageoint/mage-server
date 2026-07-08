import { Component, Inject } from '@angular/core';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LayersService, Layer } from '../layers.service';

@Component({
    selector: 'mage-delete-layer',
    templateUrl: './delete-layer.component.html',
    styleUrls: ['./delete-layer.component.scss'],
    standalone: false
})
export class DeleteLayerComponent {
    layer: Layer;
    deleting = false;
    error: string | null = null;

    constructor(
        public dialogRef: MatDialogRef<DeleteLayerComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { layer: Layer },
        private layersService: LayersService
    ) {
        this.layer = data.layer;
    }

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

    cancel(): void {
        this.dialogRef.close();
    }
}

import { Component, Inject, signal } from '@angular/core';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { LayersService, Layer } from '../layers.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
    selector: 'mage-delete-layer',
    templateUrl: './delete-layer.component.html',
    styleUrls: ['./delete-layer.component.scss'],
    standalone: true,
    imports: [
        MatDialogModule,
        MatIconModule,
        MatButtonModule,
        A11yModule,
    ]
})
export class DeleteLayerComponent {
    layer: Layer;
    readonly deleting = signal(false);
    readonly error = signal<string | null>(null);

    constructor(
        public dialogRef: MatDialogRef<DeleteLayerComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { layer: Layer },
        private layersService: LayersService
    ) {
        this.layer = data.layer;
    }

    deleteLayer(): void {
        this.deleting.set(true);
        this.error.set(null);

        this.layersService.deleteLayer(this.layer).subscribe({
            next: () => {
                this.dialogRef.close(this.layer);
            },
            error: (error) => {
                console.error('Error deleting layer:', error);
                this.deleting.set(false);

                if (error.error?.message) {
                    this.error.set(error.error.message);
                } else if (error.statusText && error.status) {
                    this.error.set(`Error ${error.status}: ${error.statusText}`);
                } else if (error.message) {
                    this.error.set(error.message);
                } else {
                    this.error.set('Failed to delete layer. Please try again.');
                }
            }
        });
    }

    cancel(): void {
        this.dialogRef.close();
    }
}

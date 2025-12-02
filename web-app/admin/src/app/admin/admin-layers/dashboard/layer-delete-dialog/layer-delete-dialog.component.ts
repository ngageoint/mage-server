import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LayersService, Layer } from '../../layers.service';

@Component({
  selector: 'app-layer-delete-dialog',
  templateUrl: './layer-delete-dialog.component.html',
  styleUrls: ['./layer-delete-dialog.component.scss']
})
export class LayerDeleteDialogComponent {
  layer: Layer;
  deleting = false;
  error: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<LayerDeleteDialogComponent>,
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
        this.deleting = false;
        this.dialogRef.close(this.layer);
      },
      error: (err) => {
        this.deleting = false;
        this.error = 'Failed to delete layer. Please try again.';
        console.error('Error deleting layer:', err);
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

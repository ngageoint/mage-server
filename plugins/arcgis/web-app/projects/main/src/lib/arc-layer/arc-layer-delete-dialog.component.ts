import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'arc-layer-delete-dialog',
	templateUrl: 'arc-layer-delete-dialog.component.html',
	styleUrls: ['./arc-layer-delete-dialog.component.scss']
})
export class ArcLayerDeleteDialogComponent {

	url: string

	constructor(
		public dialogRef: MatDialogRef<ArcLayerDeleteDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: string
	) {
		this.url = data
	}
}

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface SymbologyDialogData {
    primary?: string;
    variant?: string;
    icon?: string;
    style?: {
        stroke?: string;
        strokeOpacity?: number;
        strokeWidth?: number;
        fill?: string;
        fillOpacity?: number;
    };
}

@Component({
    selector: 'symbology-dialog',
    templateUrl: './symbology-dialog.component.html',
    styleUrls: ['./symbology-dialog.component.scss']
})
export class SymbologyDialogComponent implements OnInit {
    style: {
        stroke: string;
        strokeOpacity: number;
        strokeWidth: number;
        fill: string;
        fillOpacity: number;
    };
    iconFile: File | null = null;
    iconPreview: string | null = null;

    constructor(
        public dialogRef: MatDialogRef<SymbologyDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: SymbologyDialogData
    ) {
        // Initialize with defaults
        this.style = {
            stroke: '#3388ff',
            strokeOpacity: 1.0,
            strokeWidth: 2,
            fill: '#3388ff',
            fillOpacity: 0.2
        };

        // Override with existing values if provided
        if (data.style) {
            this.style = { ...this.style, ...data.style };
        }

        this.iconPreview = data.icon || null;
    }

    ngOnInit(): void { }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.iconFile = file;

            // Create preview
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.iconPreview = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        this.dialogRef.close({
            style: this.style,
            file: this.iconFile
        });
    }
}

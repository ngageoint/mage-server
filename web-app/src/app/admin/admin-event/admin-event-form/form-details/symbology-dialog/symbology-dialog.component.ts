import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

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
    styleUrls: ['./symbology-dialog.component.scss'],
    imports: [
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule
    ]
})
export class SymbologyDialogComponent implements OnInit {
    private readonly dialogRef = inject(MatDialogRef<SymbologyDialogComponent>);
    readonly data = inject<SymbologyDialogData>(MAT_DIALOG_DATA);

    style: {
        stroke: string;
        strokeOpacity: number;
        strokeWidth: number;
        fill: string;
        fillOpacity: number;
    };
    iconFile: File | null = null;
    readonly iconPreview = signal<string | null>(null);

    constructor() {
        // Initialize with defaults
        this.style = {
            stroke: '#3388ff',
            strokeOpacity: 1.0,
            strokeWidth: 2,
            fill: '#3388ff',
            fillOpacity: 0.2
        };

        // Override with existing values if provided
        if (this.data.style) {
            this.style = { ...this.style, ...this.data.style };
        }

        this.iconPreview.set(this.data.icon || null);
    }

    ngOnInit(): void { }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.iconFile = file;

            // Create preview
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.iconPreview.set(e.target.result);
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

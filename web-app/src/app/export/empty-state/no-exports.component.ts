import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Output } from "@angular/core";
import { MatDialogModule } from "@angular/material/dialog";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";

@Component({
	selector: 'no-exports',
	standalone: true,
	imports: [
	  CommonModule,
	  MatDialogModule,
	  MatIconModule,
	  MatDividerModule
	],
	templateUrl: 'no-exports.component.html',
	styleUrls: ['./no-exports.component.scss']
})
export class NoExportsComponent {

	@Output() close = new EventEmitter<void>();

	openExport(): void {
		this.close.emit();
	}
}
import { Component, EventEmitter, Output } from "@angular/core";

@Component({
	selector: 'no-exports',
	templateUrl: 'no-exports.component.html',
	styleUrls: ['./no-exports.component.scss']
})
export class NoExportsComponent {

	@Output() close = new EventEmitter<void>();

	openExport(): void {
		this.close.emit();
	}
}
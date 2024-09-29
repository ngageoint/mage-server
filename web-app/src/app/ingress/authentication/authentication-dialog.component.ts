import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../api/api.service';
import { Api } from '../../api/api.entity';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'authentication-dialog',
	templateUrl: 'authentication-dialog.component.html',
	styleUrls: ['./authentication-dialog.component.scss']
})
export class AuthenticationDialogComponent implements OnInit {
	api: Api

	constructor(
		private apiService: ApiService,
		public dialogRef: MatDialogRef<AuthenticationDialogComponent>
	) {}

	ngOnInit(): void {
		this.apiService.getApi().subscribe((api: Api) => {
			this.api = api
		})
	}

	onIngress(): void {
		this.dialogRef.close()
	}
}

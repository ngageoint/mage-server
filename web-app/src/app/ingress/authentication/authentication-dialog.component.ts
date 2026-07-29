import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../api/api.service';
import { Api } from '../../api/api.entity';
import { MatDialogRef as MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'authentication-dialog',
    templateUrl: 'authentication-dialog.component.html',
    styleUrls: ['./authentication-dialog.component.scss'],
    standalone: false
})
export class AuthenticationDialogComponent implements OnInit {
	api: Api
	dialogTitle = 'Sign in to Mage'

	constructor(
		private apiService: ApiService,
		private router: Router,
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

	onCancel(): void {
		this.router.navigate(['landing'])
		this.dialogRef.close()
	}
}

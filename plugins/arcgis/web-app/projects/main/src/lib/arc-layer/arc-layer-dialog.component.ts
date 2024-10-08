import { Component, Inject, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectionList } from '@angular/material/list';
import { AuthType, FeatureServiceConfig } from '../ArcGISConfig';
import { ArcService, FeatureLayer } from '../arc.service';

enum State { Validate, Layers }

interface AuthenticationType {
	title: string
	value: string
}

export interface DialogData {
	featureService?: FeatureServiceConfig
}

@Component({
	selector: 'arc-layer-dialog',
	templateUrl: 'arc-layer-dialog.component.html',
	styleUrls: ['./arc-layer-dialog.component.scss']
})
export class ArcLayerDialogComponent {
	State = State
	state: State = State.Validate

	loading = false

	AuthenticationType = AuthType
	authenticationTypes: AuthenticationType[] = [{
		title: 'OAuth',
		value: AuthType.OAuth
	},{
		title: 'Username/Password',
		value: AuthType.UsernamePassword
	},{
		title: 'Token',
		value: AuthType.Token
	}]

	layerForm: FormGroup
	layers: FeatureLayer[]
	featureService: FeatureServiceConfig

	@ViewChild(MatSelectionList) layerList: MatSelectionList

	constructor(
		public dialogRef: MatDialogRef<ArcLayerDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: DialogData,
		private arcService: ArcService
	) {
		if (data.featureService) {
			this.featureService = data.featureService
		}
		const auth: any = this.featureService?.auth || {}
		const { type, token, username, password, clientId } = auth

		this.state = this.featureService === undefined ? State.Validate : State.Layers
		// TODO update all fields with info from pass in service
		this.layerForm = new FormGroup({
			url: new FormControl(this.featureService?.url, [Validators.required]),
			authenticationType: new FormControl(type || AuthType.OAuth, [Validators.required]),
			token: new FormGroup({
				token: new FormControl(token, [Validators.required])
			}),
			oauth: new FormGroup({
				clientId: new FormControl(clientId, [Validators.required])
			}),
			local: new FormGroup({
				username: new FormControl(username, [Validators.required]),
				password: new FormControl(password, [Validators.required])
			})
		})

		if (this.featureService) {
			this.fetchLayers(this.featureService.url)
		}
	}

	hasLayer(featureLayer: FeatureLayer): boolean {
		return this.featureService.layers.some(layer => layer.layer === featureLayer.name)
	}

	fetchLayers(url: string): void {
		this.loading = true
		this.arcService.fetchFeatureServiceLayers(url).subscribe(layers => {
			this.layers = layers
			this.loading = false
		})
	}

	onPanelOpened(state: State): void {
		this.state = state
	}

	onValidate(): void {
		this.loading = true
		const { url, authenticationType } = this.layerForm.value

		switch (authenticationType) {
			case AuthType.Token: {
				const { token } = this.layerForm.controls.token.value
				this.featureService = { url, auth: { type: AuthType.Token, token }, layers: [] }
				this.arcService.validateFeatureService(this.featureService).subscribe((service) => this.validated(service))

				break;
			}
			case AuthType.OAuth: {
				const { clientId } = this.layerForm.controls.oauth.value
				this.featureService = { url, auth: { type: AuthType.OAuth, clientId }, layers: [] }
				this.arcService.oauth(url, clientId).subscribe((service) => this.validated(service))

				break;
			}
			case AuthType.UsernamePassword: {
				const { username, password } = this.layerForm.controls.local.value
				this.featureService = { url, auth: { type: AuthType.UsernamePassword, username, password }, layers: [] }
				this.arcService.validateFeatureService(this.featureService).subscribe((service) => this.validated(service))

				break;
			}
		}
	}

	validated(service: FeatureServiceConfig): void {
		this.state = State.Layers
		this.featureService = service
		this.fetchLayers(service.url)
	}

	onSave(): void {
		this.featureService.layers = this.layerList.selectedOptions.selected.map(option => {
			return { layer: `${option.value}` }
		})
		this.dialogRef.close(this.featureService)
	}
}

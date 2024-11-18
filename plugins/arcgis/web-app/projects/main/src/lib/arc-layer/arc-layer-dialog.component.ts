import { Component, Inject, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectionList } from '@angular/material/list';
import { FeatureServiceConfig } from '../ArcGISConfig';
import { ArcService, FeatureLayer } from '../arc.service';

enum State { Validate, Layers }

enum AuthenticationType {
	Token = 'token',
	UsernamePassword = 'usernamePassword',
	OAuth = 'oauth'
}

type AuthenticationState = {
	text: string
	value: AuthenticationType
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

	AuthenticationType = AuthenticationType
	authenticationStates: AuthenticationState[] = [{
		text: 'OAuth',
		value: AuthenticationType.OAuth
	},{
		text: 'Username/Password',
		value: AuthenticationType.UsernamePassword
	},{
		text: 'API Key',
		value: AuthenticationType.Token
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

		this.state = this.featureService === undefined || !this.featureService.authenticated ? State.Validate : State.Layers
		this.layerForm = new FormGroup({
			url: new FormControl({value: this.featureService?.url, disabled: this.featureService !== undefined }, [Validators.required]),
			authenticationType: new FormControl('', [Validators.required]),
			token: new FormGroup({
				token: new FormControl('', [Validators.required])
			}),
			oauth: new FormGroup({
				clientId: new FormControl('', [Validators.required])
			}),
			local: new FormGroup({
				username: new FormControl('', [Validators.required]),
				password: new FormControl('', [Validators.required])
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
			case AuthenticationType.Token: {
				const { token } = this.layerForm.controls.token.value
				this.arcService.validateFeatureService({ url, token }).subscribe((service) => this.validated(service))
				break;
			}
			case AuthenticationType.OAuth: {
				const { clientId } = this.layerForm.controls.oauth.value
				this.arcService.oauth(url, clientId).subscribe((service) => this.validated(service))
				break;
			}
			case AuthenticationType.UsernamePassword: {
				const { username, password } = this.layerForm.controls.local.value
				this.arcService.validateFeatureService({url, username, password}).subscribe((service) => this.validated(service))
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

	onCancel(): void {
		this.dialogRef.close()
	}
}

import { Component, Inject, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectionList } from '@angular/material/list';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FeatureServiceConfig } from '../ArcGISConfig';
import { ArcService, DiscoveredFeatureService, DiscoveryRequest, DiscoveryResult, FeatureLayer } from '../arc.service';

enum State { Validate, Layers }

enum EntryMode { Url, Portal }

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
	standalone: false,
	selector: 'arc-layer-dialog',
	templateUrl: 'arc-layer-dialog.component.html',
	styleUrls: ['./arc-layer-dialog.component.scss']
})
export class ArcLayerDialogComponent implements OnDestroy {
	State = State
	state: State = State.Validate

	EntryMode = EntryMode
	entryMode: EntryMode = EntryMode.Portal

	loading = false
	searching = false
	validationError: string | undefined
	hasBrowsed = false
	discoveredServices: DiscoveredFeatureService[] = []
	discoveredTotal = 0
	readonly pageSize = 20
	filterControl = new FormControl('')
	private filterSubscription: Subscription
	private discoveredStart = 1
	private discoveredIdentityManager: string
	private discoveredPortalUrl: string | undefined
	discoveredMayLackEditPrivilege: boolean | undefined

	AuthenticationType = AuthenticationType
	authenticationStates: AuthenticationState[] = [{
		text: 'OAuth',
		value: AuthenticationType.OAuth
	}, {
		text: 'Username/Password',
		value: AuthenticationType.UsernamePassword
	}, {
		text: 'API Key',
		value: AuthenticationType.Token
	}]

	layerForm: FormGroup
	layers: FeatureLayer[]
	featureService: FeatureServiceConfig

	// validate/confirm persist a placeholder feature service (no layers) so the layers panel can
	// authenticate against it before layers are actually chosen; if this dialog is for a brand new
	// service and gets cancelled before Set Layers is clicked, that placeholder needs to be rolled back
	private readonly isNewService: boolean
	private layersSaved = false

	@ViewChild('layerList') layerList: MatSelectionList

	constructor(
		public dialogRef: MatDialogRef<ArcLayerDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: DialogData,
		private arcService: ArcService
	) {
		this.isNewService = data.featureService === undefined
		if (data.featureService) {
			this.featureService = data.featureService
		}

		this.state = this.featureService === undefined || !this.featureService.authenticated ? State.Validate : State.Layers
		this.layerForm = new FormGroup({
			url: new FormControl({ value: this.featureService?.url, disabled: this.featureService !== undefined }, [Validators.required]),
			portalUrl: new FormControl(this.featureService?.portalUrl || ''),
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

		this.filterSubscription = this.filterControl.valueChanges.pipe(
			debounceTime(300),
			distinctUntilChanged()
		).subscribe((filter) => this.onFilterChanged(filter))
	}

	ngOnDestroy(): void {
		this.filterSubscription.unsubscribe()
	}

	hasLayer(featureLayer: FeatureLayer): boolean {
		return this.featureService.layers.some(layer => layer.layer === featureLayer.name)
	}

	// MAGE writes observations to the layer, so it needs at least Create capability;
	// missing capabilities here usually means the service (or this user's role/sharing) doesn't allow edits
	canEdit(featureLayer: FeatureLayer): boolean {
		const capabilities = featureLayer.capabilities?.split(',').map(c => c.trim()) || []
		return capabilities.includes('Create') || capabilities.includes('Editing')
	}

	get hasNonEditableLayers(): boolean {
		return !!this.layers?.some(layer => !this.canEdit(layer))
	}

	// only warn when we positively confirmed the privilege is missing; undefined means the check
	// couldn't be performed (e.g. no known portal URL, or the request failed) and should stay silent.
	get showLimitedPermissionWarning(): boolean {
		return this.featureService?.mayLackEditPrivilege === true || this.discoveredMayLackEditPrivilege === true
	}

	get canBrowse(): boolean {
		const { portalUrl, authenticationType } = this.layerForm.getRawValue()
		return !!portalUrl && !!authenticationType && this.hasRequiredAuthFields(authenticationType)
	}

	get canValidate(): boolean {
		const { url, authenticationType } = this.layerForm.getRawValue()
		return !!url && !!authenticationType && this.hasRequiredAuthFields(authenticationType)
	}

	private hasRequiredAuthFields(authenticationType: AuthenticationType): boolean {
		switch (authenticationType) {
			case AuthenticationType.Token:
				return !!this.layerForm.controls.token.value.token
			case AuthenticationType.OAuth:
				return !!this.layerForm.controls.oauth.value.clientId
			case AuthenticationType.UsernamePassword: {
				const { username, password } = this.layerForm.controls.local.value
				return !!username && !!password
			}
			default:
				return false
		}
	}

	// unlike canEdit(), a missing capabilities string here just means we don't know (most portals
	// don't expose it on the item), so only flag services we can positively confirm are read-only
	isReadOnly(service: DiscoveredFeatureService): boolean {
		if (!service.capabilities) {
			return false
		}
		const capabilities = service.capabilities.split(',').map(c => c.trim())
		return !capabilities.includes('Create') && !capabilities.includes('Editing')
	}

	hasSelectedLayers = false
	onLayerSelectionChange(): void {
		this.hasSelectedLayers = this.layerList.selectedOptions.selected.length > 0
	}

	fetchLayers(url: string): void {
		this.loading = true
		this.arcService.fetchFeatureServiceLayers(url).subscribe({
			next: (layers) => {
				this.layers = layers
				this.loading = false
				this.hasSelectedLayers = !!this.featureService?.layers?.length
				layers.forEach(layer => console.log(`[${layer.name}] capabilities:`, layer.capabilities))
			},
			error: (error) => {
				console.log('arc-layer fetchFeatureServiceLayers error: ' + error);
				this.loading = false
			}
		})
	}

	onPanelOpened(state: State): void {
		this.state = state
	}

	onValidate(): void {
		this.loading = true
		this.validationError = undefined
		// use the "raw" value, since it will include the URL from the possibly-disabled input field
		const { url, portalUrl, authenticationType } = this.layerForm.getRawValue()

		switch (authenticationType) {
			case AuthenticationType.Token: {
				const { token } = this.layerForm.controls.token.value
				this.arcService.validateFeatureService({ url, portalUrl, token }).subscribe({
					next: (service) => this.validated(service),
					error: (error) => this.onValidateError(error)
				})
				break;
			}
			case AuthenticationType.OAuth: {
				const { clientId } = this.layerForm.controls.oauth.value
				this.arcService.oauth(url, clientId, portalUrl).subscribe({
					next: (service) => this.validated(service),
					error: (error) => this.onValidateError(error)
				})
				break;
			}
			case AuthenticationType.UsernamePassword: {
				const { username, password } = this.layerForm.controls.local.value
				this.arcService.validateFeatureService({ url, portalUrl, username, password }).subscribe({
					next: (service) => this.validated(service),
					error: (error) => this.onValidateError(error)
				})
				break;
			}
		}
	}

	validated(service: FeatureServiceConfig): void {
		this.state = State.Layers
		this.featureService = service
		// the server may have resolved the portal url to something other than what was typed
		this.layerForm.controls.portalUrl.setValue(service.portalUrl || '')
		this.fetchLayers(service.url)
	}

	private onValidateError(error: unknown): void {
		console.log('arc-layer validate feature service error: ' + error)
		this.loading = false
		this.validationError = this.extractErrorMessage(error)
	}

	private extractErrorMessage(error: unknown): string {
		if (typeof error === 'string' && error) {
			return error
		}
		if (error && typeof error === 'object') {
			const httpError = error as { error?: unknown, message?: string, status?: number }
			if (typeof httpError.error === 'string' && httpError.error) {
				return httpError.error
			}
			if (httpError.status === 0) {
				return 'Unable to reach the feature service. Check the URL and your network connection.'
			}
			if (httpError.message) {
				return httpError.message
			}
		}
		return 'Failed to authenticate with the feature service. Check your credentials and try again.'
	}

	onBrowse(): void {
		this.discoveredServices = []
		this.discoveredTotal = 0
		this.discoveredStart = 1
		this.hasBrowsed = true
		this.validationError = undefined
		const filter = this.filterControl.value || undefined
		const { portalUrl, authenticationType } = this.layerForm.getRawValue()
		if (!portalUrl) {
			return
		}

		this.loading = true

		// already authenticated against this portal (e.g. re-browsing to apply a filter) - reuse
		// the existing identity instead of re-authenticating, which for OAuth would reopen the popup
		// and, since that flow doesn't carry paging/filter state, silently discard the filter
		if (this.discoveredIdentityManager && this.discoveredPortalUrl === portalUrl) {
			this.discover({ portalUrl, identityManager: this.discoveredIdentityManager, start: 1, num: this.pageSize, filter })
			return
		}

		switch (authenticationType) {
			case AuthenticationType.Token: {
				const { token } = this.layerForm.controls.token.value
				this.discover({ portalUrl, token, start: 1, num: this.pageSize, filter })
				break;
			}
			case AuthenticationType.OAuth: {
				const { clientId } = this.layerForm.controls.oauth.value
				this.arcService.oauthDiscover(portalUrl, clientId).subscribe({ next: (result) => this.onDiscovered(result), error: (error) => this.onDiscoverError(error) })
				break;
			}
			case AuthenticationType.UsernamePassword: {
				const { username, password } = this.layerForm.controls.local.value
				this.discover({ portalUrl, username, password, start: 1, num: this.pageSize, filter })
				break;
			}
		}
	}

	onNextPage(): void {
		this.discover({
			portalUrl: this.discoveredPortalUrl as string,
			identityManager: this.discoveredIdentityManager,
			start: this.discoveredStart + this.pageSize,
			num: this.pageSize,
			filter: this.filterControl.value || undefined
		})
	}

	onPrevPage(): void {
		this.discover({
			portalUrl: this.discoveredPortalUrl as string,
			identityManager: this.discoveredIdentityManager,
			start: Math.max(1, this.discoveredStart - this.pageSize),
			num: this.pageSize,
			filter: this.filterControl.value || undefined
		})
	}

	private onFilterChanged(filter: string | null): void {
		if (!this.discoveredIdentityManager) {
			return
		}
		this.discover({
			portalUrl: this.discoveredPortalUrl as string,
			identityManager: this.discoveredIdentityManager,
			start: 1,
			num: this.pageSize,
			filter: filter || undefined
		})
	}

	get hasPrevPage(): boolean {
		return this.discoveredStart > 1
	}

	get hasNextPage(): boolean {
		return this.discoveredStart + this.discoveredServices.length - 1 < this.discoveredTotal
	}

	private discover(request: DiscoveryRequest): void {
		this.loading = true
		this.searching = true
		this.arcService.discoverFeatureServices(request).subscribe({
			next: (result) => this.onDiscovered(result),
			error: (error) => this.onDiscoverError(error)
		})
	}

	private onDiscovered(result: DiscoveryResult): void {
		this.discoveredIdentityManager = result.identityManager
		this.discoveredPortalUrl = result.portalUrl
		// the server may have resolved the portal url to something other than what was typed
		if (result.portalUrl) {
			this.layerForm.controls.portalUrl.setValue(result.portalUrl)
		}
		// only a fresh sign-in includes this
		if (result.mayLackEditPrivilege !== undefined) {
			this.discoveredMayLackEditPrivilege = result.mayLackEditPrivilege
		}
		this.discoveredServices = result.services
		this.discoveredTotal = result.total
		this.discoveredStart = result.start
		this.loading = false
		this.searching = false
	}

	private onDiscoverError(error: unknown): void {
		console.log('arc-layer discover feature services error: ' + error);
		this.loading = false
		this.searching = false
		this.validationError = this.extractErrorMessage(error)
	}

	onSelectDiscoveredService(service: DiscoveredFeatureService): void {
		this.loading = true
		this.validationError = undefined
		this.arcService.confirmFeatureService(service.url, this.discoveredPortalUrl, this.discoveredIdentityManager).subscribe({
			next: (confirmed) => {
				this.loading = false
				this.validated(confirmed)
			},
			error: (error) => {
				console.log('arc-layer confirm feature service error: ' + error);
				this.loading = false
				this.validationError = this.extractErrorMessage(error)
			}
		})
	}

	onSave(): void {
		this.featureService.layers = this.layerList.selectedOptions.selected.map(option => {
			return { layer: `${option.value}` }
		})
		this.layersSaved = true
		this.dialogRef.close(this.featureService)
	}

	onCancel(): void {
		if (this.isNewService && this.featureService && !this.layersSaved) {
			this.arcService.deleteFeatureService(this.featureService.url).subscribe({
				error: (error) => console.log('arc-layer delete unsaved feature service error: ' + error)
			})
		}
		this.dialogRef.close()
	}
}

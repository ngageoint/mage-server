import { Component, inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { A11yModule } from "@angular/cdk/a11y";
import { LinkGenerator } from "./utilities/link-generator";
import { Api } from "../api/api.entity";
import { ApiService } from "../api/api.service";

@Component({
    selector: 'contact-dialog',
    templateUrl: 'contact-dialog.component.html',
    styleUrls: ['./contact-dialog.component.scss'],
    imports: [MatDialogModule, MatButtonModule, A11yModule]
})
export class ContactDialogComponent  {
    private readonly apiService = inject(ApiService);
    readonly data: any = inject(MAT_DIALOG_DATA);
    readonly dialogRef: MatDialogRef<ContactDialogComponent> = inject(MatDialogRef);

    statusTitle: string;
    statusMessage: string;
    id: string;
    strategy: any;
    emailLink: string;
    phoneLink: string;

    constructor() {
			this.statusTitle = this.data.info.statusTitle
			this.statusMessage = this.data.info.statusMessage
			this.id = this.data.info.id
			this.strategy = this.data.strategy

			this.apiService.getApi().subscribe((api: Api) => {
				this.statusMessage = `${this.statusMessage}${this.generateContactMessage(api)}`
			})
    }

    private generateContactMessage(api: Api): string {
        const emailLink = LinkGenerator.emailLink(api.contactInfo, this.statusMessage, this.id, this.strategy)
        const phoneLink = LinkGenerator.phoneLink(api.contactInfo);

				let message = ""
        if (emailLink || phoneLink) {
            message += "<br /><br />"
          message += "You may contact your Mage administrator via "
            if (emailLink) {
							message += "<a href=" + emailLink + ">Email</a>"
            }
            if (emailLink && phoneLink) {
							message += " or "
            }
            if (phoneLink) {
							message += "<a href=" + phoneLink + ">Phone</a>"
            }
						message += " for further assistance."
        }

				return message
    }

    close(): void {
			this.dialogRef.close('cancel')
    }
}
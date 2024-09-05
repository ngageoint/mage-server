import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { LinkGenerator } from "./utilities/link-generator";
import { Api } from "../api/api.entity";
import { ApiService } from "../api/api.service";

@Component({
    selector: 'contact-dialog',
    templateUrl: 'contact-dialog.component.html',
    styleUrls: ['./contact-dialog.component.scss'],
})
export class ContactDialogComponent  {
    statusTitle: string;
    statusMessage: string;
    id: string;
    strategy: any;
    emailLink: string;
    phoneLink: string;

    constructor(
        private apiService: ApiService,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public dialogRef: MatDialogRef<ContactDialogComponent>
    ) {
			this.statusTitle = data.info.statusTitle
			this.statusMessage = data.info.statusMessage
			this.id = data.info.id
			this.strategy = data.strategy

			apiService.getApi().subscribe((api: Api) => {
				this.statusMessage = `${this.statusMessage}${this.generateContactMessage(api)}`
			})
    }

    private generateContactMessage(api: Api): string {
        const emailLink = LinkGenerator.emailLink(api.contactInfo, this.statusMessage, this.id, this.strategy)
        const phoneLink = LinkGenerator.phoneLink(api.contactInfo);

				var message = ""
        if (emailLink || phoneLink) {
            message += "<br /><br />"
					  message += "You may contact your MAGE administrator via "
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
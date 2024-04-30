import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { LinkGenerator } from "./utilities/link-generator";

@Component({
    selector: 'contact-dialog',
    templateUrl: 'contact-dialog.component.html',
    styleUrls: ['./contact-dialog.component.scss'],
})
export class ContactDialogComponent implements OnInit {
    api: any;
    statusTitle: string;
    statusMessage: string;
    id: string;
    strategy: any;
    emailLink: string;
    phoneLink: string;

    constructor(
        public dialogRef: MatDialogRef<ContactDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any) {

        this.api = data.api;
        this.statusTitle = data.info.statusTitle;
        this.statusMessage = data.info.statusMessage;
        this.id = data.info.id;
        this.strategy = data.strategy;
    }

    ngOnInit(): void {
        const emailLink = LinkGenerator.emailLink(this.api.contactinfo, this.statusMessage, this.id, this.strategy);
        const phoneLink = LinkGenerator.phoneLink(this.api.contactinfo);

        if (emailLink || phoneLink) {
            this.statusMessage += "<br /><br />";
            this.statusMessage += "You may contact your MAGE administrator via ";
            if (emailLink) {
                this.statusMessage += "<a href=" + emailLink + ">Email</a>";
            }
            if (emailLink && phoneLink) {
                this.statusMessage += " or ";
            }
            if (phoneLink) {
                this.statusMessage += "<a href=" + phoneLink + ">Phone</a>";
            }
            this.statusMessage += " for further assistance.";
        }
    }

    close(): void {
        this.dialogRef.close('cancel');
    }
}
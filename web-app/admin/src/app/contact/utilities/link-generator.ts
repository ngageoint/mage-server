import { EmailBuilder } from "./email-builder";

export class LinkGenerator {
    static emailLink(adminContactInfo: any, statusMessage: string, username: string, strategy: any): string {
        let url: string;
        if (adminContactInfo && adminContactInfo.email) {
            const emailBuilder = new EmailBuilder(statusMessage, username, strategy);
            emailBuilder.build();

            url = 'mailto:' + encodeURIComponent(adminContactInfo.email);
            url += '?subject=' + encodeURIComponent(emailBuilder.subject);
            url += '&body=' + encodeURIComponent(emailBuilder.body);
        }

        return url;
    }

    static phoneLink(adminContactInfo: any): string {
        let url: string;
        if (adminContactInfo && adminContactInfo.phone) {
            url = 'tel:' + adminContactInfo.phone;
        }

        return url;
    }
}
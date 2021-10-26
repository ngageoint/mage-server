export class EmailBuilder {
    _statusMessage: string;
    _identifier: string;
    _strategy: any;
    _subject: string;
    _body: string;

    constructor(statusMessage: string, identifier: string, strategy: any) {
        this._statusMessage = statusMessage;
        this._identifier = identifier;
        this._strategy = strategy;

        this._subject = '';
        this._body = '';
    }

    get subject(): string {
        return this._subject;
    }

    get body(): string {
        return this._body;
    }

    build(): void {

        const upperStatusMsg = this._statusMessage.toUpperCase();
        if (upperStatusMsg.includes('DEVICE')) {
            if (upperStatusMsg.includes('REGISTER')) {
                this._subject = 'Please approve my device';
            } else {
                this._subject = 'Device ID issue';
            }
        } else {
            if (upperStatusMsg.includes('APPROVED') || upperStatusMsg.includes('ACTIVATE')) {
                this._subject = "Please activate my account"
            } else if (upperStatusMsg.includes('DISABLED')) {
                this._subject = "Please enable my account"
            } else if (upperStatusMsg.includes('LOCKED')) {
                this._subject = "Please unlock my account"
            } else if (upperStatusMsg.includes('CAPTCHA')) {
                this._subject = "CAPTCHA issue"
            } else if (upperStatusMsg.includes('EVENT')) {
                this._subject = "Please add me to an event";
            } else {
                this._subject = 'User login issue';
            }
        }

        if (this._identifier) {
            this._subject += ' - ' + this._identifier;
            this._body += 'Identifier (username or device id): ' + this._identifier + '\n';
        }
        if (this._strategy) {
            this._body += 'Authentication Method: ';
            if (this._strategy.title) {
                this._body += this._strategy.title;
            } else {
                this._body += this._strategy;
            }
            this._body += '\n';
        }

        this._body += 'Error Message Received: ' + this._statusMessage;
    }
}
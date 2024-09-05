export class ArcEventLayer {
    domain: string;
    service: string;
    name: string;
    isSelected: boolean;

    constructor(domain: string, service: string, name: string) {
        this.domain = domain;
        this.service = service;
        this.name = name;
        this.isSelected = true;
    }
}
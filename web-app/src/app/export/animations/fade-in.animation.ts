import { trigger, animate, transition, style, state } from '@angular/animations';

export const fadeInAnimation = trigger('fadeIn', [
    transition(':enter', [
        style({ opacity: 0 }),
        animate('.5s ease', style({ opacity: 1 }))
    ]),
]);
import { trigger, animate, transition, style, state } from '@angular/animations';

export const flyInOutAnimation = trigger('flyInOut', [
    transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('.2s ease')
    ]),
    transition(':leave', [
        animate('.2s ease', style({ transform: 'translateX(100%)' }))
    ])
]);
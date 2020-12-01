import { trigger, animate, transition, style, state } from '@angular/animations';

export const flyInOutAnimation =  trigger('flyInOut', [
    state('in', style({ transform: 'translateX(0)' })),
    transition('void => *', [
        style({ transform: 'translateX(-100%)' }),
        animate(105)
    ]),
    transition('* => void', [
        animate(150, style({ transform: 'translateX(100%)' }))
    ])
]);
import { trigger, state, animate, transition, style } from '@angular/animations';

export const slideInOutAnimation =
    trigger('slideInOutAnimation', [

        state('*', style({
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)'
        })),
        transition(':enter', [
            style({
                right: '-400%',
                backgroundColor: 'rgba(0, 0, 0, 0)'
            }),
            animate('.5s ease-in-out', style({
                right: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)'
            }))
        ]),
        transition(':leave', [
            animate('.5s ease-in-out', style({
                right: '-400%',
                backgroundColor: 'rgba(0, 0, 0, 0)'
            }))
        ])
    ]);
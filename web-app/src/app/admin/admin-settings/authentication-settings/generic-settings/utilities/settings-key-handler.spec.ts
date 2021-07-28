import { SettingsKeyHandler } from "./settings-key-handler";

describe('Settings key handler tests', () => {
    it('Test exists', () => {
        const handler = new SettingsKeyHandler();
        expect(handler.exists('doesNotExist')).toBe(false);
        expect(handler.exists('doesNotExist.doesNotExist2')).toBe(false);

        const settings = {
            key: 'value',
            key2: {
                key3: 'value2'
            }
        };

        expect(handler.exists('key', settings)).toBe(true);
        expect(handler.exists('key2.key3', settings)).toBe(true);
        expect(handler.exists('key2.fake2', settings)).toBe(false);
    });

    it('Test delete', () => {
        const settings = {
            a: 'b',
            c: {
                d: 'e',
                f: 'g'
            },
            h: {
                i: 'j'
            }
        };
        const handler = new SettingsKeyHandler();
        handler.delete('a', settings);
        expect(settings.a).toBeFalsy();

        handler.delete('c.d', settings);
        expect(settings.c).toBeTruthy();
        expect(settings.c.d).toBeFalsy();

        handler.delete('h', settings);
        expect(settings.h).toBeFalsy();
    });

    it('Test flatten and set', () => {
        const settings = {
            a: 'b'
        };
        const handler = new SettingsKeyHandler();
        handler.flattenAndSet('c', 'd', settings);
        expect(settings['c']).toBeTruthy();

        handler.flattenAndSet('e.f', 'g', settings);
        expect(settings['e']).toBeTruthy();
        expect(settings['e']['f']).toBeTruthy();

        handler.flattenAndSet('a', 'newB', settings);
        expect(settings.a).toEqual('newB');
    });
});
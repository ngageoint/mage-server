import { PasswordPipe } from './password.pipe';

describe('PasswordPipe', () => {
  it('create an instance', () => {
    const pipe = new PasswordPipe();
    expect(pipe).toBeTruthy();
  });
});

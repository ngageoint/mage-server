export interface AuthLoginData {
  token: string;
  newUser?: boolean;
}

export interface SigninEvent {
  user: any;
  token: string;
  strategy: string;
}

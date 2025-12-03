export interface SignInCredentials {
    email: string;
    password: string;
}

export interface SignUpCredentials {
    email: string;
    password: string;
    confirmPassword: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
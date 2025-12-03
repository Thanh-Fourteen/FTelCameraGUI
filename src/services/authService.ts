import apiClient from "./api/apiClient";
import type { AuthTokens, SignInCredentials, SignUpCredentials } from "../types/auth";
import type { ApiResponse } from "../types/api";

/**
 * Sign In function
 * @returns Promise ONLY contain accessToken (string)
 */
export const signIn = async (
    credentials: SignInCredentials
): Promise<string> => {

    const tokens = await apiClient.post<ApiResponse<AuthTokens>,  AuthTokens>(
        '/auth/user',
        credentials
    )

    if (!tokens || !tokens.accessToken || !tokens.refreshToken){ 
        throw new Error("Data is not acceptable")
    }

    localStorage.setItem('refreshToken', tokens.refreshToken);
    return tokens.accessToken;
}


/**
 * Sign Up function
 * @returns success code
 */

export const signUp = async(
    credentials: SignUpCredentials
) => {
    const response = await apiClient.post(
        '/auth/register',
        credentials
    )
    
    if (!response) {
        throw new Error('Register failed')
    }

    return response
}

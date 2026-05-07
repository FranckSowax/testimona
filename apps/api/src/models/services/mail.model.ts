import { GetAccessTokenResponse } from "google-auth-library/build/src/auth/oauth2client";

export interface SendMailModel {
    readonly success: boolean;
    readonly error: any;
    readonly mailId: string;
    readonly mailResponse: string;
}

export interface GoogleApiConfigurationModel {
    readonly accessToken: GetAccessTokenResponse;
}
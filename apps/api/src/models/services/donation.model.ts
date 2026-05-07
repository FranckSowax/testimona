import { DonationStatus } from "@prisma/client";
import { PhotoServiceModel } from "./photo.model";

class DonationUserServiceModel {
    constructor(
        readonly userId: string,
        readonly lastname: string,
        readonly firstname: string,
        readonly nickname: string,
        readonly photos: Array<PhotoServiceModel> | undefined
    ) {}
}

export interface AdminDonationServiceModel {
    readonly total: number;
    readonly donationItems: Array<DonationServiceModel>
}

export interface DonationServiceModel {
    readonly donationId: string;
    readonly memorialIdFk: number;
    readonly userIdFk: string;
    readonly checkoutId: string;
    readonly donorEmail: string;
    readonly comment: string;
    readonly amount: number;
    readonly anonymous: boolean;
    readonly date: Date;
    readonly status: DonationStatus;
    readonly donorDetails: DonationUserServiceModel;
}

export interface DonationStartProcessServiceModel {
    readonly donationId: string;
}

export interface DonationStripeServiceModel {
    readonly checkoutId: string;
    readonly donationId: string;
    readonly amount: number;
    readonly comment: string;
    readonly email: string;
    readonly status: DonationStatus;
} 

export interface DonationUpdatedServiceModel {
    readonly donationId: string;
    readonly memorialId: number;
    readonly memorialUrl: string;
}

export interface DonationGoalServiceModel {
    donationGoal: number;
    totalAmountDonation: number;
    message: string;
}
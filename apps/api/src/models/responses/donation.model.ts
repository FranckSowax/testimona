export interface DonationGoalResponseModel {
    donationGoal: number;
    totalAmountDonation: number;
}

interface DonationUserPhotoResponseModel {
    readonly urls: {
        readonly circle: string,
        readonly thumbnail: string,
        readonly medium: string,
        readonly full: string
    };
}

interface DonationUserServiceModel {
    readonly userId: string;
    readonly lastname: string;
    readonly firstname: string;
    readonly nickname: string;
    readonly photos: DonationUserPhotoResponseModel | undefined;
}

export interface DonationResponseModel {
    readonly comment: string;
    readonly amount: number;
    readonly anonymous: boolean;
    readonly date: Date;
    readonly donorDetails: DonationUserServiceModel;
}

export interface AdminDonationGoalResponseModel {
    donationGoal: number;
    totalAmountDonation: number;
}

export interface AdminDonationResponseModel {
    readonly total: number;
    readonly donations: Array<DonationResponseModel>;
}

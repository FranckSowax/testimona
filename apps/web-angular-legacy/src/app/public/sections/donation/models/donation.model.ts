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
    readonly firstname: string,
    readonly lastname: string,
    readonly nickname: string,
    readonly photos: DonationUserPhotoResponseModel | undefined;
}

export interface DonationItemModel {
    readonly comment: string;
    readonly amount: number;
    readonly anonymous: boolean;
    readonly date: Date;
    readonly donorDetails: DonationUserServiceModel;
}

export interface DonationGoalModel {
    donationGoal: number;
    totalAmountDonation: number;
    message: string;
}

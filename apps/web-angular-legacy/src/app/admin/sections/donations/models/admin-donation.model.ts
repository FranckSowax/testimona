interface AdminDonationUserPhotoModel {
    readonly urls: {
        readonly circle: string,
        readonly thumbnail: string,
        readonly medium: string,
        readonly full: string
    };
}

interface AdminDonationUserModel {
    readonly userId: string;
    readonly lastname: string;
    readonly firstname: string;
    readonly nickname: string;
    readonly photos: AdminDonationUserPhotoModel | undefined;
}

export interface AdminDonationItemModel {
    readonly comment: string;
    readonly amount: number;
    readonly anonymous: boolean;
    readonly date: Date;
    readonly donorDetails: AdminDonationUserModel;
}

export interface AdminDonationModel {
    readonly numberOfDonation: number;
    readonly donations: Array<AdminDonationItemModel>;
}

export interface AdminDonationGoalModel {
    donationGoal: number;
    totalAmountDonation: number;
}

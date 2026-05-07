import { MediaObjectType } from "@prisma/client";

export interface UserLikedItem {
    readonly userId: string;
    readonly itemId: string;
    readonly itemType: MediaObjectType;
}
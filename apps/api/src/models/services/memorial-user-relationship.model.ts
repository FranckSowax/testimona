import { Relative } from ".prisma/client";

export class MemorialUserRelationshipModel {
  constructor(
    readonly memorialId: number,
    readonly userId: string,
    readonly relationship: Relative,
    readonly isAdmin: boolean,
  ) {}
}

export class MemorialAdminUserRelationshipModel {
  constructor(
    readonly memorialId: number,
    readonly identity: string,
    readonly relationship: Relative,
    readonly isAdmin: boolean,
  ) {}
}

export class MemorialAdminUserForRequestEmailModel {
  constructor(
    readonly userId: string,
    readonly email: string
  ) {}
}

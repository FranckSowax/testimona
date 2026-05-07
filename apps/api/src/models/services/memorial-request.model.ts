import { MemorialRequestAdminStatus, Relative } from '@prisma/client';

export class MemorialRequestCreateModel {
  constructor(
    readonly id: string,
    readonly memorialId: number,
    readonly applicantId: string,
    readonly relationship: Relative,
    readonly note: string,
    readonly status: MemorialRequestAdminStatus,
  ) {}
}

export class MemorialRequestModel {
  constructor(
    readonly id: string,
    readonly memorialId: number,
    readonly applicantId: string,
    readonly relationship: Relative,
    readonly note: string,
    readonly status: MemorialRequestAdminStatus,
  ) {}
}

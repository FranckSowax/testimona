export class MemorialRequestAdminModel {
    constructor(
      readonly memorialId: number,
      readonly relative: string,
      readonly note: string
    ) {}
  }
export class TestimonaCreateModel {
  constructor(readonly content: string, readonly relative: string) {}
}

export class TestimonaCreateModalModel {
  constructor(
    readonly memorialId: number,
    readonly memorialUrl: string,
    readonly relative: number,
  ) {}
}

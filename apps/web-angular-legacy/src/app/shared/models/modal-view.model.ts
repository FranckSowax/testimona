import { ModalNameEnum, ModalStateEnum } from "../enums/modal.enum";

export class ModalViewModel {
    constructor(readonly id: ModalNameEnum, public state: ModalStateEnum, public closingState?: ModalStateEnum) {}
}
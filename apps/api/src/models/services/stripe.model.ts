export interface StripeCheckoutSessionServiceModel {
    readonly checkouId: string;
    readonly amount: number;
    readonly clientReferenceId: string;
    readonly currency: string;
    readonly email: string;
    readonly comment: string;
    readonly paymentIntent: string;
}

export interface StripePaymentIntentServiceModel {
    readonly paymentIntentId: string;
    readonly paymentMethod: string;
    readonly paymentStatus: StripePaymentIntentStatus;
}

export type StripePaymentIntentStatus =
| 'canceled'
| 'processing'
| 'requires_action'
| 'requires_capture'
| 'requires_confirmation'
| 'requires_payment_method'
| 'succeeded';
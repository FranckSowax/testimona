import Stripe from "stripe";
import { LogService } from "./log.service";
import { LogTypeError } from "@prisma/client";
import { ErrorServiceModel } from "../../models/_.models";
import { StripeCheckoutSessionServiceModel, StripePaymentIntentServiceModel } from "../../models/services/stripe.model";

const ServiceName = 'StripeService';

export class StripeService {
    private _stripeApi: Stripe;
    
    private static _instance: StripeService;
    static getInstance(): StripeService {
        if (!StripeService._instance) {
            StripeService._instance = new StripeService();
        }
        return StripeService._instance;
    }
  
    constructor() {
        this._stripeApi = new Stripe(process.env.STRIPE_SK!, {
            apiVersion: '2022-11-15',
            protocol: 'https'
        });
    }

    async retrieveCheckoutSession(checkoutId: string): Promise<StripeCheckoutSessionServiceModel | undefined> {
        try {
            const checkoutSessionData = await this._stripeApi.checkout.sessions.retrieve(checkoutId);
            if (checkoutSessionData == null || checkoutSessionData == undefined || checkoutSessionData.id == undefined) {
                return Promise.resolve(undefined);
            }

            return Promise.resolve({
                checkouId: checkoutSessionData.id,
                amount: +checkoutSessionData.amount_total!,
                clientReferenceId: checkoutSessionData.client_reference_id!,
                currency: checkoutSessionData.currency!,
                email: checkoutSessionData.customer_details!.email!,
                comment: checkoutSessionData.custom_fields[0].text?.value ?? '',
                paymentIntent: checkoutSessionData.payment_intent!.toString()
            });
        } catch (error: any) {
            console.log(error)
            if (error.type == 'StripeInvalidRequestError') {
                if (error.raw.code == 'resource_missing') {
                    return Promise.resolve(undefined);
                }
            }

            console.log(error);
            LogService.getInstance().create(
                LogTypeError.Error,
                new ErrorServiceModel(ServiceName, 'retrieveCheckoutSession', { checkoutId }),
                error.message,
              );
        }
    }

    async retrievePaymentIntent(paymentIntent: string): Promise<StripePaymentIntentServiceModel | undefined> {
        try {
            const paymentIntentData = await this._stripeApi.paymentIntents.retrieve(paymentIntent);
            if (paymentIntentData == null || paymentIntentData == undefined || paymentIntentData.id == undefined) {
                return Promise.resolve(undefined);
            }

            return Promise.resolve({
                paymentIntentId: paymentIntentData.id,
                paymentMethod: paymentIntentData.payment_method!.toString(),
                paymentStatus: paymentIntentData.status
            });
        } catch (error: any) {
            if (error.type == 'StripeInvalidRequestError') {
                if (error.raw.code == 'resource_missing') {
                    return Promise.resolve(undefined);
                }
            }

            console.log(error);
            LogService.getInstance().create(
                LogTypeError.Error,
                new ErrorServiceModel(ServiceName, 'retrievePaymentIntent', { paymentIntent }),
                error.message,
              );
        }
    }
}

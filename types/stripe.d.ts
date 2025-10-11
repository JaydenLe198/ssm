declare module '@stripe/stripe-js' {
  export type Stripe = {
    confirmPayment?: (params: any) => Promise<any>;
  } & Record<string, any>;

  export type StripeElementsOptions = {
    clientSecret?: string;
    appearance?: Record<string, unknown>;
  };

  export type StripeElements = Record<string, unknown>;

  export type StripeFactory = {
    paymentIntents?: Record<string, unknown>;
  } & Stripe;

  export function loadStripe(key: string): Promise<StripeFactory | null>;
}

declare module '@stripe/react-stripe-js' {
  import type { StripeElementsOptions, StripeFactory, StripeElements } from '@stripe/stripe-js';
  import * as React from 'react';

  export interface ElementsProps {
    stripe: Promise<StripeFactory | null> | StripeFactory | null;
    options?: StripeElementsOptions;
    children?: React.ReactNode;
  }

  export function Elements(props: ElementsProps): JSX.Element;
  export function useStripe(): StripeFactory | null;
  export function useElements(): StripeElements | null;
  export interface PaymentElementProps {
    id?: string;
    className?: string;
  }
  export function PaymentElement(props?: PaymentElementProps): JSX.Element;
}

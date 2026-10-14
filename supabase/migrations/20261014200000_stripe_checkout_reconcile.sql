-- Extra payment states for cancelled / expired Stripe Checkout Sessions.
-- Must be applied before 20261014201000 (new values cannot be used in the same transaction).

alter type public.payment_status add value if not exists 'cancelled';
alter type public.payment_status add value if not exists 'expired';

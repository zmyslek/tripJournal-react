import { useState } from "react";
import { redirectToCheckout, type CheckoutPlan } from "../lib/stripeCheckout";

export default function PremiumPlans() {
    const [loading, setLoading] = useState(false);
    const [checkoutReady, setCheckoutReady] = useState(false);

    async function handleSubscribe(plan: CheckoutPlan) {
        setLoading(true);
        setCheckoutReady(false);

        try {
            await redirectToCheckout(plan);
            setCheckoutReady(true);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <h2>Premium Plans</h2>

            <button onClick={() => handleSubscribe("monthly")}>
                Monthly Plan
            </button>

            <button onClick={() => handleSubscribe("yearly")}>
                Yearly Plan
            </button>

            <button onClick={() => handleSubscribe("lifetime")}>
                Lifetime Plan
            </button>

            {loading && <p>Loading payment...</p>}
            {checkoutReady && <p>Redirecting to Stripe Checkout...</p>}

            <div id="checkout" />
        </div>
    );
}

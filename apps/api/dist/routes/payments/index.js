import { Router } from "express";
import Stripe from "stripe";
import { PrismaClient } from "@scriptify/db";
import { getEnvOptional } from "../../config.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";
const router = Router();
const prisma = new PrismaClient();
const PRO_CHECKOUT_URL = "https://buy.stripe.com/test_eVq5kF3EZ1zP5yu3DRb7y00";
const DONATE_URL = "https://donate.stripe.com/test_00wcN76Rb0vLd0Wcanb7y01";
function getStripe() {
    const key = getEnvOptional("STRIPE_SECRET_KEY");
    if (!key)
        return null;
    return new Stripe(key);
}
// POST /api/v1/payments/create-checkout
router.post("/create-checkout", authenticateToken, async (req, res) => {
    const user = req.user;
    const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const stripe = getStripe();
    if (!stripe) {
        // Fallback: redirect directly to the Stripe payment link
        res.json({ url: PRO_CHECKOUT_URL });
        return;
    }
    try {
        // Get or create Stripe customer
        let customerId = (await prisma.user.findUnique({
            where: { id: user.id },
            select: { stripeCustomerId: true },
        }))?.stripeCustomerId ?? undefined;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { userId: user.id, username: user.username },
            });
            customerId = customer.id;
            await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: customerId },
            });
        }
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: "Scriptify Pro" },
                        unit_amount: 499,
                        recurring: { interval: "month" },
                    },
                    quantity: 1,
                },
            ],
            success_url: `${WEB_ORIGIN}/pro?success=1`,
            cancel_url: `${WEB_ORIGIN}/pro?canceled=1`,
            metadata: { userId: user.id },
        });
        res.json({ url: session.url ?? PRO_CHECKOUT_URL });
    }
    catch (err) {
        console.error("Stripe create-checkout error:", err);
        // Fall back to direct link on any Stripe error
        res.json({ url: PRO_CHECKOUT_URL });
    }
});
// POST /api/v1/payments/donate
router.post("/donate", async (_req, res) => {
    const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const stripe = getStripe();
    if (!stripe) {
        res.json({ url: DONATE_URL });
        return;
    }
    try {
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: "Support Scriptify" },
                        unit_amount: 500,
                    },
                    quantity: 1,
                    adjustable_quantity: { enabled: true, minimum: 1, maximum: 100 },
                },
            ],
            success_url: `${WEB_ORIGIN}/?donated=1`,
            cancel_url: `${WEB_ORIGIN}/`,
        });
        res.json({ url: session.url ?? DONATE_URL });
    }
    catch (err) {
        console.error("Stripe donate error:", err);
        res.json({ url: DONATE_URL });
    }
});
// POST /api/v1/payments/webhook
router.post("/webhook", 
// Raw body needed for Stripe signature verification — mounted before express.json()
async (req, res) => {
    const stripe = getStripe();
    const webhookSecret = getEnvOptional("STRIPE_WEBHOOK_SECRET");
    if (!stripe || !webhookSecret) {
        res.sendStatus(200);
        return;
    }
    const sig = req.headers["stripe-signature"];
    if (!sig) {
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
    }
    let event;
    try {
        // req.body is a raw Buffer when this route is mounted before express.json()
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Webhook signature error:", msg);
        res.status(400).json({ error: `Webhook error: ${msg}` });
        return;
    }
    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const userId = session.metadata?.userId;
            if (userId) {
                const proExpiresAt = new Date();
                proExpiresAt.setMonth(proExpiresAt.getMonth() + 1);
                await prisma.user.update({
                    where: { id: userId },
                    data: { isPro: true, proExpiresAt, monthlyBoostCredits: 1 },
                });
            }
        }
        else if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object;
            const customerId = typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer.id;
            await prisma.user.updateMany({
                where: { stripeCustomerId: customerId },
                data: { isPro: false, proExpiresAt: null, monthlyBoostCredits: 0 },
            });
        }
    }
    catch (err) {
        console.error("Webhook handler error:", err);
    }
    res.sendStatus(200);
});
export default router;

import { Router, Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../../lib/prisma.js";
import { getEnvOptional } from "../../config.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";

const router = Router();

function getStripe(): Stripe | null {
  const key = getEnvOptional("STRIPE_SECRET_KEY");
  if (!key) return null;
  return new Stripe(key);
}

// POST /api/v1/payments/create-checkout
router.post("/create-checkout", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const proCheckoutUrl = process.env.PRO_CHECKOUT_URL;
  if (!proCheckoutUrl) {
    res.status(503).json({ error: "Payment service is not configured" });
    return;
  }

  const user = req.user!;
  const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const stripe = getStripe();

  if (!stripe) {
    res.json({ url: proCheckoutUrl });
    return;
  }

  try {
    // Get or create Stripe customer
    let customerId = (
      await prisma.user.findUnique({
        where: { id: user.id },
        select: { stripeCustomerId: true },
      })
    )?.stripeCustomerId ?? undefined;

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

    res.json({ url: session.url ?? proCheckoutUrl });
  } catch {
    res.json({ url: proCheckoutUrl });
  }
});

// POST /api/v1/payments/donate — returns checkout URL from DONATE_URL
router.post("/donate", async (_req: Request, res: Response): Promise<void> => {
  const donateUrl = process.env.DONATE_URL;
  if (!donateUrl) {
    res.status(503).json({ message: "Donations are not configured" });
    return;
  }
  res.json({ url: donateUrl });
});

// POST /api/v1/payments/webhook
router.post(
  "/webhook",
  // Raw body needed for Stripe signature verification — mounted before express.json()
  async (req: Request, res: Response): Promise<void> => {
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

    let event: Stripe.Event;
    try {
      // req.body is a raw Buffer when this route is mounted before express.json()
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        webhookSecret
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: `Webhook error: ${msg}` });
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId) {
          const proExpiresAt = new Date();
          proExpiresAt.setMonth(proExpiresAt.getMonth() + 1);
          await prisma.user.update({
            where: { id: userId },
            data: { isPro: true, proExpiresAt, monthlyBoostCredits: 1 },
          });
        }
      } else if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { isPro: false, proExpiresAt: null, monthlyBoostCredits: 0 },
        });
      }
    } catch {
      //
    }

    res.sendStatus(200);
  }
);

export default router;

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// CREATE SUBSCRIPTION CHECKOUT SESSION
app.post("/create-checkout-session", async (req, res) => {
  const { priceId } = req.body;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ui_mode: "embedded",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    return_url: "http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}",
  });

  res.json({ clientSecret: session.client_secret });
});

// GET SESSION STATUS (for success page)
app.get("/session-status", async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.query.session_id);

  res.json({
    status: session.status,
    customer_email: session.customer_details?.email,
  });
});

app.listen(4242, () => console.log("Server running on http://localhost:4242"));
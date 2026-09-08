import { Webhook } from "svix";
import { InvalidWebhookSignatureError } from "../application/errors";
import { SvixWebhookVerifier } from "./svix-webhook-verifier";

const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";

describe("SvixWebhookVerifier", () => {
  it("verifies a genuinely, correctly-signed payload and returns the parsed body", () => {
    const body = JSON.stringify({ event_type: "subscription.create", customer_id: "cust_1" });
    const id = "msg_test_1";
    const timestamp = new Date();
    // Uses the real `svix` package's own signer to produce a genuinely
    // valid signature — proves this wrapper plumbs through to the exact
    // verification algorithm production traffic will be checked against,
    // not a hand-rolled reimplementation of it.
    const signature = new Webhook(SECRET).sign(id, timestamp, body);

    const verifier = new SvixWebhookVerifier();
    const result = verifier.verify(SECRET, body, {
      "svix-id": id,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signature,
    });

    expect(result).toEqual({ event_type: "subscription.create", customer_id: "cust_1" });
  });

  it("rejects a tampered body against a signature computed for a different payload", () => {
    const originalBody = JSON.stringify({ event_type: "subscription.create" });
    const id = "msg_test_2";
    const timestamp = new Date();
    const signature = new Webhook(SECRET).sign(id, timestamp, originalBody);

    const verifier = new SvixWebhookVerifier();
    const tamperedBody = JSON.stringify({ event_type: "subscription.cancel" });

    expect(() =>
      verifier.verify(SECRET, tamperedBody, {
        "svix-id": id,
        "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
        "svix-signature": signature,
      }),
    ).toThrow(InvalidWebhookSignatureError);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const body = JSON.stringify({ event_type: "subscription.create" });
    const id = "msg_test_3";
    const timestamp = new Date();
    const signature = new Webhook("whsec_" + Buffer.from("a-completely-different-secret").toString("base64")).sign(id, timestamp, body);

    const verifier = new SvixWebhookVerifier();
    expect(() =>
      verifier.verify(SECRET, body, {
        "svix-id": id,
        "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
        "svix-signature": signature,
      }),
    ).toThrow(InvalidWebhookSignatureError);
  });

  it("rejects a malformed signature header outright", () => {
    const verifier = new SvixWebhookVerifier();
    expect(() =>
      verifier.verify(SECRET, "{}", { "svix-id": "msg_4", "svix-timestamp": "1700000000", "svix-signature": "not-a-real-signature" }),
    ).toThrow(InvalidWebhookSignatureError);
  });
});

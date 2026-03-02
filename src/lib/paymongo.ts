import crypto from 'crypto';

/**
 * PayMongo API client and helpers
 * Uses the PayMongo Links API for payment collection
 */

const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

interface CreatePaymentLinkParams {
  amount: number; // Amount in centavos (PHP * 100)
  description: string;
  remarks?: string;
}

interface PaymentLinkResponse {
  id: string;
  checkout_url: string;
}

/**
 * Create a PayMongo payment link
 * @param params.amount - Amount in centavos (e.g., 10000 = PHP 100.00)
 * @param params.description - Description shown to the customer
 * @param params.remarks - Optional internal remarks
 * @returns Payment link ID and checkout URL
 */
export async function createPaymentLink({
  amount,
  description,
  remarks,
}: CreatePaymentLinkParams): Promise<PaymentLinkResponse> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error('PAYMONGO_SECRET_KEY environment variable is not set');
  }

  const response = await fetch(`${PAYMONGO_API_URL}/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount,
          description,
          remarks: remarks || undefined,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `PayMongo API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();
  return {
    id: data.data.id,
    checkout_url: data.data.attributes.checkout_url,
  };
}

/**
 * Verify PayMongo webhook signature using HMAC-SHA256
 * @param payload - Raw request body as string
 * @param sigHeader - The Paymongo-Signature header value
 * @param webhookSecret - The webhook secret from PayMongo dashboard
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  sigHeader: string,
  webhookSecret: string
): boolean {
  // PayMongo signature header format: t=<timestamp>,te=<test_signature>,li=<live_signature>
  // We need to extract the timestamp and signature, then verify
  const parts = sigHeader.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const liveSigPart = parts.find((p) => p.startsWith('li='));
  const testSigPart = parts.find((p) => p.startsWith('te='));

  if (!timestampPart) {
    return false;
  }

  const timestamp = timestampPart.slice(2); // Remove 't='
  const signature = liveSigPart?.slice(3) || testSigPart?.slice(3); // Remove 'li=' or 'te='

  if (!signature) {
    return false;
  }

  // Construct the signed payload: timestamp + '.' + payload
  const signedPayload = `${timestamp}.${payload}`;

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// Feature 005-ora-facciamo-la: Event Management Dashboard
// Date: 2025-10-08
// QR Code generation service using qrcode library

import QRCode from 'qrcode';

/**
 * Generates a PNG QR code for a participant access token
 * @param token - The 21-character access token string
 * @param eventSlug - The event slug for URL construction
 * @returns PNG buffer (300x300px, error correction M, margin 2)
 */
export async function generateTokenQR(token: string, eventSlug: string): Promise<Buffer> {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const url = `${FRONTEND_URL}/events/${eventSlug}?token=${token}`;

  try {
    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    return qrBuffer;
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

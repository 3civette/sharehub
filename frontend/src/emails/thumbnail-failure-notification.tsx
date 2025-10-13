/**
 * React Email Template: Thumbnail Generation Failure Notification
 * Feature: 009-voglio-implementare-la (Thumbnail Generation)
 * Purpose: Notify tenant admins of repeated thumbnail generation failures
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface ThumbnailFailureEmailProps {
  tenantName: string;
  eventName: string;
  failureCount: number;
  failedSlides: Array<{
    filename: string;
    errorMessage: string;
  }>;
  dashboardUrl: string;
  supportEmail: string;
}

export const ThumbnailFailureEmail = ({
  tenantName = 'Your Organization',
  eventName = 'Event Name',
  failureCount = 3,
  failedSlides = [],
  dashboardUrl = 'https://sharehub.app/admin/dashboard',
  supportEmail = 'support@sharehub.app',
}: ThumbnailFailureEmailProps) => {
  const previewText = `${failureCount} thumbnail generation failures for ${eventName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Thumbnail Generation Issues</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={paragraph}>
              Hello <strong>{tenantName}</strong>,
            </Text>

            <Text style={paragraph}>
              We've detected <strong>{failureCount} consecutive failures</strong>{' '}
              while attempting to generate thumbnails for slides in your event{' '}
              <strong>{eventName}</strong>.
            </Text>

            {/* Failure Details */}
            <Section style={failureBox}>
              <Heading as="h2" style={h2}>
                Failed Slides
              </Heading>
              {failedSlides.map((slide, index) => (
                <div key={index} style={slideItem}>
                  <Text style={slideFilename}>
                    {index + 1}. {slide.filename}
                  </Text>
                  <Text style={slideError}>{slide.errorMessage}</Text>
                </div>
              ))}
            </Section>

            {/* Common Causes */}
            <Section style={infoBox}>
              <Heading as="h3" style={h3}>
                Common Causes
              </Heading>
              <ul style={list}>
                <li style={listItem}>
                  <strong>Corrupted files:</strong> The file may be damaged or
                  incomplete.
                </li>
                <li style={listItem}>
                  <strong>Unsupported formats:</strong> Only PPT, PPTX, and PDF
                  files are supported.
                </li>
                <li style={listItem}>
                  <strong>Large file size:</strong> Files over 100MB may timeout
                  during processing.
                </li>
                <li style={listItem}>
                  <strong>Protected content:</strong> Password-protected or
                  DRM-protected files cannot be processed.
                </li>
              </ul>
            </Section>

            {/* Action Steps */}
            <Section style={infoBox}>
              <Heading as="h3" style={h3}>
                What You Can Do
              </Heading>
              <ol style={list}>
                <li style={listItem}>
                  <strong>Check the files:</strong> Ensure the files are not
                  corrupted and are in a supported format.
                </li>
                <li style={listItem}>
                  <strong>Re-upload:</strong> Try re-uploading the files if they
                  appear damaged.
                </li>
                <li style={listItem}>
                  <strong>Manual retry:</strong> You can manually retry thumbnail
                  generation from the dashboard.
                </li>
                <li style={listItem}>
                  <strong>Contact support:</strong> If the issue persists, reach
                  out to our support team.
                </li>
              </ol>
            </Section>

            {/* CTA Buttons */}
            <Section style={buttonContainer}>
              <Button style={button} href={dashboardUrl}>
                View Dashboard
              </Button>
            </Section>

            <Text style={paragraph}>
              Need help? Contact us at{' '}
              <Link href={`mailto:${supportEmail}`} style={link}>
                {supportEmail}
              </Link>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated notification from shareHub. You're receiving
              this because you're an admin for {tenantName}.
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} shareHub. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ThumbnailFailureEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 40px',
  backgroundColor: '#3b82f6',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '0',
};

const content = {
  padding: '0 40px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
  marginBottom: '16px',
};

const h2 = {
  color: '#1f2937',
  fontSize: '22px',
  fontWeight: '700',
  lineHeight: '1.3',
  marginTop: '0',
  marginBottom: '16px',
};

const h3 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.3',
  marginTop: '0',
  marginBottom: '12px',
};

const failureBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '20px',
  marginTop: '24px',
  marginBottom: '24px',
};

const infoBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  padding: '20px',
  marginTop: '24px',
  marginBottom: '24px',
};

const slideItem = {
  marginBottom: '16px',
  paddingBottom: '16px',
  borderBottom: '1px solid #fecaca',
};

const slideFilename = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#dc2626',
  margin: '0 0 4px 0',
};

const slideError = {
  fontSize: '14px',
  color: '#991b1b',
  margin: '0',
  fontFamily: 'monospace',
};

const list = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#374151',
  paddingLeft: '20px',
  marginTop: '8px',
  marginBottom: '8px',
};

const listItem = {
  marginBottom: '8px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '32px',
  marginBottom: '32px',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};

const footer = {
  padding: '32px 40px',
  backgroundColor: '#f9fafb',
  borderTop: '1px solid #e5e7eb',
};

const footerText = {
  fontSize: '12px',
  lineHeight: '20px',
  color: '#6b7280',
  textAlign: 'center' as const,
  margin: '8px 0',
};

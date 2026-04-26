import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interactive Business Card',
  description: "Jason's private, token-gated contracting services chat.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

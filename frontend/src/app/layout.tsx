import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
// @ts-ignore: Allow side-effect CSS import without type declarations
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Meridian',
  description: 'Comprehensive healthcare and inventory management system',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

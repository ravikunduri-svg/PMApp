import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'PMPathfinder — AI-Powered PM Interview Prep',
  description: 'Diagnostic PM coaching: find your weak dimensions, practice with AI scoring, check JD readiness.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-950 text-gray-100 font-[family-name:var(--font-geist)] antialiased">
        {children}
      </body>
    </html>
  )
}

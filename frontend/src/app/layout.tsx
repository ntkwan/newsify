import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Newsify - Your Daily News',
    description: 'Your Daily News, Summarized and Spoken',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <div className="min-h-screen bg-white">
                    <Header />
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}

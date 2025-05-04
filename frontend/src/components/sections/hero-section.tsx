import Link from 'next/link';

export default function HeroSection() {
    return (
        <section className="text-center py-10 border-b border-gray-100">
            <Link href="/">
                <h1 className="text-[#01aa4f] text-5xl font-bold mb-3">
                    Newsify
                </h1>
            </Link>
            <p className="text-gray-700 text-lg">
                Your Daily News, Summarized and Spoken
            </p>
        </section>
    );
}

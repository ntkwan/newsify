import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HeroSection() {
    return (
        <section className="relative py-16 overflow-hidden bg-gradient-to-b from-white to-gray-50">
            <div className="absolute inset-0 bg-[url('/images/patterns/grid.svg')] opacity-5"></div>
            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <Link href="/" className="inline-block">
                        <motion.h1
                            className="text-[#01aa4f] text-6xl font-bold mb-4 tracking-tight hover:scale-105 transition-transform"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Newsify
                        </motion.h1>
                    </Link>
                    <motion.p
                        className="text-gray-700 text-xl max-w-2xl mx-auto leading-relaxed"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        Your Daily News, Summarized and Spoken
                    </motion.p>
                    <motion.div
                        className="mt-8 flex justify-center gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <Link
                            href="/daily-podcasts"
                            className="px-6 py-3 bg-[#01aa4f] text-white rounded-full font-medium hover:bg-[#018a3f] transition-colors shadow-lg hover:shadow-xl"
                        >
                            Listen Now
                        </Link>
                        <Link
                            href="/articles"
                            className="px-6 py-3 bg-white text-[#01aa4f] rounded-full font-medium hover:bg-gray-50 transition-colors border border-[#01aa4f] shadow-lg hover:shadow-xl"
                        >
                            Read Articles
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
        </section>
    );
}

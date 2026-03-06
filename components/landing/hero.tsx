'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  }

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-6xl font-bold text-foreground leading-tight"
          >
            Your voice. Your ward. Resolved.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            File civic complaints, track resolution progress, and connect with authorities. A transparent platform for civic grievances.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
          >
            <Link href="/citizen-file" className="inline-flex">
              <button className="px-8 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:bg-opacity-90 transition-all">
                File a Complaint
              </button>
            </Link>
            <Link href="/track" className="inline-flex">
              <button className="px-8 py-3 border border-border text-foreground font-medium rounded-md hover:bg-secondary transition-all">
                Track Complaint
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Award } from 'lucide-react'

const features = [
  {
    icon: CheckCircle2,
    title: 'File Complaint',
    description: 'Describe your civic issue in detail. Our AI agent gathers essential information and routes to the right department.',
  },
  {
    icon: ArrowRight,
    title: 'Automatic Routing',
    description: 'Complaints are intelligently routed to the appropriate department based on category and location.',
  },
  {
    icon: Award,
    title: 'Track & Resolve',
    description: 'Monitor progress in real-time. Get updates on status and estimated resolution time.',
  },
]

export function Features() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
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
    <section className="py-20 px-6 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-4xl font-bold text-foreground text-center mb-16"
        >
          How It Works
        </motion.h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-card p-8 rounded-lg border border-border hover:border-primary transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

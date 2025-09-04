'use client';

import { motion } from 'framer-motion';

export default function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-white to-gray-200">
        <motion.div
          className="absolute inset-0"
          animate={{
            backgroundImage: [
              `radial-gradient(circle at 20% 50%, rgba(0,0,0,0.1) 0%, transparent 50%),
               radial-gradient(circle at 80% 80%, rgba(0,0,0,0.05) 0%, transparent 50%),
               radial-gradient(circle at 40% 20%, rgba(0,0,0,0.08) 0%, transparent 50%)`,
              `radial-gradient(circle at 80% 50%, rgba(0,0,0,0.1) 0%, transparent 50%),
               radial-gradient(circle at 20% 80%, rgba(0,0,0,0.05) 0%, transparent 50%),
               radial-gradient(circle at 60% 20%, rgba(0,0,0,0.08) 0%, transparent 50%)`,
              `radial-gradient(circle at 20% 50%, rgba(0,0,0,0.1) 0%, transparent 50%),
               radial-gradient(circle at 80% 80%, rgba(0,0,0,0.05) 0%, transparent 50%),
               radial-gradient(circle at 40% 20%, rgba(0,0,0,0.08) 0%, transparent 50%)`,
            ],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
        />
      </div>
      <div className="w-full max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left space-y-8"
          >
            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-6xl lg:text-7xl font-black tracking-tight leading-none text-black"
              >
                BENEFITS
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="block text-black"
                >
                  ASSISTANT
                </motion.span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-xl lg:text-2xl leading-relaxed text-black"
              >
                Your intelligent benefits companion powered by AI
              </motion.p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-white p-10 glass-hover"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

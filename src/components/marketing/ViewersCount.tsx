import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';

interface ViewersCountProps {
  className?: string;
}

export function ViewersCount({ className }: ViewersCountProps) {
  const [count, setCount] = useState(() => Math.floor(Math.random() * 8) + 5); // 5-12 initial

  useEffect(() => {
    // Simulate slight variations in viewer count
    const interval = setInterval(() => {
      setCount(prev => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        const newCount = prev + change;
        return Math.max(3, Math.min(20, newCount)); // Keep between 3-20
      });
    }, 8000 + Math.random() * 4000); // Every 8-12 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl text-white/70 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Eye className="w-4 h-4 text-emerald-400" />
      <span>
        <motion.span
          key={count}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-semibold text-white"
        >
          {count}
        </motion.span>
        {' '}personas viendo ahora
      </span>
    </motion.div>
  );
}

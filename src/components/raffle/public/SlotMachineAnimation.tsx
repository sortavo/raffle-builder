import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, Zap } from 'lucide-react';

interface SlotMachineAnimationProps {
  numbers: string[];
  isSpinning: boolean;
  onComplete?: () => void;
}

// Generate random placeholder numbers for the spinning effect
function generateRandomNumbers(count: number, maxDigits: number = 3): string[] {
  return Array.from({ length: count }, () => 
    Math.floor(Math.random() * (10 ** maxDigits)).toString().padStart(maxDigits, '0')
  );
}

// Single slot reel component
function SlotReel({ 
  finalNumber, 
  isSpinning, 
  delay, 
  onStop 
}: { 
  finalNumber: string; 
  isSpinning: boolean; 
  delay: number;
  onStop?: () => void;
}) {
  const [displayNumbers, setDisplayNumbers] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStopped, setIsStopped] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isSpinning) {
      setIsStopped(false);
      // Generate random numbers for spinning effect
      const randoms = generateRandomNumbers(20, finalNumber.length);
      setDisplayNumbers([...randoms, finalNumber]);
      setCurrentIndex(0);

      // Start spinning
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= 19) {
            return prev;
          }
          return prev + 1;
        });
      }, 80);

      // Stop after delay
      const stopTimeout = setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setCurrentIndex(20); // Final number is at index 20
        setIsStopped(true);
        onStop?.();
      }, 1000 + delay);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        clearTimeout(stopTimeout);
      };
    }
  }, [isSpinning, finalNumber, delay, onStop]);

  const currentNumber = displayNumbers[currentIndex] || finalNumber;

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className={`
          relative w-12 h-16 sm:w-16 sm:h-20 md:w-20 md:h-24 rounded-lg sm:rounded-xl 
          flex items-center justify-center
          text-sm sm:text-xl md:text-2xl font-bold
          border-2 sm:border-4 transition-all duration-300
          ${isStopped 
            ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 border-amber-600 text-amber-900 shadow-lg shadow-amber-500/50' 
            : 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 text-white'
          }
        `}
        animate={!isStopped && isSpinning ? {
          y: [0, -5, 0, 5, 0],
        } : {}}
        transition={{
          duration: 0.1,
          repeat: Infinity,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={currentNumber + currentIndex}
            initial={{ y: -30, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.05 }}
            className="font-mono"
          >
            {currentNumber}
          </motion.span>
        </AnimatePresence>

        {/* Glow effect when stopped */}
        {isStopped && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-xl bg-gradient-to-br from-yellow-300/30 to-amber-400/30"
          />
        )}
      </motion.div>

      {/* Sparkle effect when stopped */}
      {isStopped && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute -top-2 -right-2"
        >
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
        </motion.div>
      )}
    </div>
  );
}

// Maximum reels to display for performance
const MAX_DISPLAY_REELS = 5;

export function SlotMachineAnimation({ 
  numbers, 
  isSpinning, 
  onComplete 
}: SlotMachineAnimationProps) {
  const [stoppedCount, setStoppedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const completedRef = useRef(false);

  // For many numbers, only show a subset for animation
  const displayNumbers = numbers.length > MAX_DISPLAY_REELS 
    ? [...numbers.slice(0, 2), '...', ...numbers.slice(-2)]
    : numbers;
  
  const totalReels = displayNumbers.filter(n => n !== '...').length;
  const hiddenCount = numbers.length > MAX_DISPLAY_REELS ? numbers.length - 4 : 0;

  useEffect(() => {
    if (isSpinning) {
      setStoppedCount(0);
      setShowConfetti(false);
      completedRef.current = false;
    }
  }, [isSpinning]);

  useEffect(() => {
    if (stoppedCount === totalReels && totalReels > 0 && !completedRef.current) {
      completedRef.current = true;
      setShowConfetti(true);
      onComplete?.();
      
      // Hide confetti after animation
      const timeout = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [stoppedCount, totalReels, onComplete]);

  if (numbers.length === 0 && !isSpinning) {
    return null;
  }

  return (
    <div className="relative">
      {/* Machine frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-2xl p-6 shadow-2xl border-4 border-slate-700"
      >
        {/* Top decoration */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <motion.div
            animate={isSpinning ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </motion.div>
          <span className="text-yellow-400 font-bold text-sm tracking-wider">LUCKY MACHINE</span>
          <motion.div
            animate={isSpinning ? { rotate: -360 } : {}}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </motion.div>
        </div>

        {/* LED lights */}
        <div className="absolute top-0 left-4 right-4 flex justify-between">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              animate={{
                backgroundColor: isSpinning 
                  ? ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#ef4444']
                  : '#22c55e',
              }}
              transition={{
                duration: 0.5,
                repeat: isSpinning ? Infinity : 0,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>

        {/* Slot reels container */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-3 py-3 sm:py-4 px-2 bg-slate-950 rounded-lg sm:rounded-xl border-2 border-slate-600 mt-4 overflow-x-auto">
          {displayNumbers.length > 0 ? (
            displayNumbers.map((num, index) => (
              num === '...' ? (
                <div 
                  key={`ellipsis-${index}`}
                  className="flex flex-col items-center justify-center w-12 h-16 sm:w-16 sm:h-20 md:w-20 md:h-24 text-slate-400 flex-shrink-0"
                >
                  <span className="text-lg sm:text-2xl font-bold">+{hiddenCount}</span>
                  <span className="text-[10px] sm:text-xs">más</span>
                </div>
              ) : (
                <SlotReel
                  key={`${num}-${index}`}
                  finalNumber={num}
                  isSpinning={isSpinning}
                  delay={index * 200} // Staggered stop effect
                  onStop={() => setStoppedCount(prev => prev + 1)}
                />
              )
            ))
          ) : (
            // Placeholder slots while spinning without numbers yet
            [...Array(3)].map((_, index) => (
              <SlotReel
                key={`placeholder-${index}`}
                finalNumber="???"
                isSpinning={isSpinning}
                delay={index * 200}
              />
            ))
          )}
        </div>

        {/* Bottom decoration */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">
            Algoritmo Criptográfico Seguro
          </span>
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
      </motion.div>

      {/* Confetti effect */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none overflow-hidden"
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#f59e0b', '#8b5cf6', '#22c55e', '#3b82f6', '#ef4444'][i % 5],
                }}
                initial={{ 
                  top: '50%', 
                  scale: 0,
                  rotate: 0,
                }}
                animate={{ 
                  top: '-20%', 
                  scale: [0, 1, 0],
                  rotate: Math.random() * 360,
                  x: (Math.random() - 0.5) * 200,
                }}
                transition={{ 
                  duration: 1.5,
                  delay: i * 0.05,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win message */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 text-sm px-4 py-2 shadow-lg">
              <Sparkles className="w-4 h-4 mr-2" />
              ¡Números de la suerte generados!
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

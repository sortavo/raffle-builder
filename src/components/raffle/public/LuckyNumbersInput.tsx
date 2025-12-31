import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WinningNumbersHistory } from "./WinningNumbersHistory";
import { 
  Cake, 
  Star, 
  Heart, 
  Plus, 
  X, 
  Sparkles,
  Calendar,
  Hash,
  Wand2
} from "lucide-react";

interface LuckyNumbersInputProps {
  maxDigits: number;
  onNumbersGenerated: (numbers: string[]) => void;
  checkAvailability: (numbers: string[]) => Promise<string[]>;
  isLoading?: boolean;
  showWinnersHistory?: boolean;
}

export function LuckyNumbersInput({
  maxDigits,
  onNumbersGenerated,
  checkAvailability,
  isLoading,
  showWinnersHistory = true
}: LuckyNumbersInputProps) {
  const [mode, setMode] = useState<'birthday' | 'favorites'>('birthday');
  const [birthdayDate, setBirthdayDate] = useState('');
  const [favoriteNumbers, setFavoriteNumbers] = useState<string[]>([]);
  const [newNumber, setNewNumber] = useState('');
  const [generatedNumbers, setGeneratedNumbers] = useState<string[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Generate ticket numbers from birthday
  const generateFromBirthday = useCallback((date: string): string[] => {
    if (!date) return [];
    
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    const lastTwoDigitsYear = year % 100;
    
    const numbers: Set<string> = new Set();
    
    // Format numbers with leading zeros based on maxDigits
    const formatNum = (n: number): string => {
      const str = n.toString();
      if (str.length > maxDigits) return str.slice(-maxDigits);
      return str.padStart(maxDigits, '0');
    };
    
    // Day (e.g., 15 -> 015 for 3 digits)
    numbers.add(formatNum(day));
    
    // Month (e.g., 03 -> 003)
    numbers.add(formatNum(month));
    
    // Day + Month combined (e.g., 1503)
    const dayMonth = parseInt(`${day}${month.toString().padStart(2, '0')}`);
    numbers.add(formatNum(dayMonth));
    
    // Month + Day combined (e.g., 0315)
    const monthDay = parseInt(`${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`);
    numbers.add(formatNum(monthDay));
    
    // Last two digits of year (e.g., 90 -> 090)
    numbers.add(formatNum(lastTwoDigitsYear));
    
    // Day + last two digits of year (e.g., 1590)
    const dayYear = parseInt(`${day}${lastTwoDigitsYear.toString().padStart(2, '0')}`);
    numbers.add(formatNum(dayYear));
    
    // Complete date combinations
    if (maxDigits >= 4) {
      // DDMM or MMDD
      numbers.add(formatNum(dayMonth));
      numbers.add(formatNum(monthDay));
    }
    
    // Sum of digits for extra lucky number
    const sumDigits = (day + month + lastTwoDigitsYear) % Math.pow(10, maxDigits);
    numbers.add(formatNum(sumDigits));
    
    // Triple day (e.g., 151515 -> last maxDigits)
    const tripleDay = parseInt(`${day}${day}${day}`);
    numbers.add(formatNum(tripleDay));
    
    return Array.from(numbers).filter(n => n.length <= maxDigits);
  }, [maxDigits]);

  // Add favorite number
  const handleAddFavorite = () => {
    if (!newNumber.trim()) return;
    
    const num = newNumber.trim().padStart(maxDigits, '0').slice(-maxDigits);
    
    if (favoriteNumbers.includes(num)) {
      toast.warning('Este número ya está en tu lista');
      return;
    }
    
    if (favoriteNumbers.length >= 10) {
      toast.warning('Máximo 10 números favoritos');
      return;
    }
    
    setFavoriteNumbers(prev => [...prev, num]);
    setNewNumber('');
  };

  // Remove favorite number
  const handleRemoveFavorite = (num: string) => {
    setFavoriteNumbers(prev => prev.filter(n => n !== num));
  };

  // Check availability and select
  const handleCheckAndSelect = async () => {
    setIsChecking(true);
    
    const numbersToCheck = mode === 'birthday' 
      ? generateFromBirthday(birthdayDate)
      : favoriteNumbers;
    
    if (numbersToCheck.length === 0) {
      toast.warning(mode === 'birthday' ? 'Ingresa tu fecha de cumpleaños' : 'Agrega números favoritos');
      setIsChecking(false);
      return;
    }
    
    try {
      setGeneratedNumbers(numbersToCheck);
      const available = await checkAvailability(numbersToCheck);
      setAvailableNumbers(available);
      
      if (available.length === 0) {
        toast.error('Ninguno de tus números de la suerte está disponible');
      } else if (available.length < numbersToCheck.length) {
        toast.info(`${available.length} de ${numbersToCheck.length} números están disponibles`);
      } else {
        toast.success('¡Todos tus números de la suerte están disponibles!');
      }
    } catch (error) {
      toast.error('Error al verificar disponibilidad');
    } finally {
      setIsChecking(false);
    }
  };

  // Select available numbers
  const handleSelectNumbers = () => {
    if (availableNumbers.length > 0) {
      onNumbersGenerated(availableNumbers);
    }
  };

  // Handle clicking a winning number from history
  const handleHistoryNumberClick = (number: string) => {
    const formatted = number.padStart(maxDigits, '0').slice(-maxDigits);
    if (!favoriteNumbers.includes(formatted)) {
      setFavoriteNumbers(prev => [...prev, formatted]);
      setMode('favorites');
      toast.success(`Número ${formatted} agregado a favoritos`);
    } else {
      toast.info(`El número ${formatted} ya está en tus favoritos`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Winning Numbers History - conditionally rendered */}
      {showWinnersHistory && (
        <WinningNumbersHistory onNumberClick={handleHistoryNumberClick} />
      )}

      <Card className="border-2 overflow-hidden bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
        <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <motion.div 
            className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Wand2 className="w-8 h-8 text-white" />
          </motion.div>
          <h3 className="text-xl font-bold text-white mb-2">Números de la Suerte</h3>
          <p className="text-white/60">Elige números basados en fechas especiales o favoritos</p>
        </div>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className="grid w-full grid-cols-2 bg-white/[0.03] p-1 rounded-xl">
            <TabsTrigger 
              value="birthday" 
              className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white flex items-center gap-2 text-white/60"
            >
              <Cake className="w-4 h-4" />
              Cumpleaños
            </TabsTrigger>
            <TabsTrigger 
              value="favorites" 
              className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white flex items-center gap-2 text-white/60"
            >
              <Star className="w-4 h-4" />
              Favoritos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="birthday" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base text-white">
                <Calendar className="w-4 h-4 text-pink-400" />
                Fecha de cumpleaños
              </Label>
              <Input
                type="date"
                value={birthdayDate}
                onChange={(e) => {
                  setBirthdayDate(e.target.value);
                  setGeneratedNumbers([]);
                  setAvailableNumbers([]);
                }}
                className="h-12 text-lg border-2 bg-white/[0.03] border-white/[0.06] text-white"
              />
            </div>

            {birthdayDate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-xl"
              >
                <p className="text-sm text-white/60 mb-2">Números que se generarán:</p>
                <div className="flex flex-wrap gap-2">
                  {generateFromBirthday(birthdayDate).map((num, i) => (
                    <motion.div
                      key={num}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Badge 
                        variant="outline" 
                        className="text-sm px-3 py-1 bg-white/[0.03] border-pink-500/30 text-pink-300"
                      >
                        #{num}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base text-white">
                <Hash className="w-4 h-4 text-amber-400" />
                Agrega tus números favoritos
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`Ej: 777`}
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFavorite()}
                  className="h-12 text-lg border-2 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/40"
                  max={Math.pow(10, maxDigits) - 1}
                />
                <Button
                  onClick={handleAddFavorite}
                  size="lg"
                  className="h-12 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Favorite Numbers List */}
            <AnimatePresence>
              {favoriteNumbers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2"
                >
                  {favoriteNumbers.map((num) => (
                    <motion.div
                      key={num}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      layout
                    >
                      <Badge 
                        className="text-sm px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 cursor-pointer hover:from-amber-600 hover:to-yellow-600 transition-all flex items-center gap-2"
                        onClick={() => handleRemoveFavorite(num)}
                      >
                        <Star className="w-3 h-3" />
                        #{num}
                        <X className="w-3 h-3 opacity-70" />
                      </Badge>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick add suggestions */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-white/40 w-full mb-1">Números populares:</span>
              {['7', '13', '21', '77', '100', '777'].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const formatted = num.padStart(maxDigits, '0').slice(-maxDigits);
                    if (!favoriteNumbers.includes(formatted)) {
                      setFavoriteNumbers(prev => [...prev, formatted]);
                    }
                  }}
                  disabled={favoriteNumbers.includes(num.padStart(maxDigits, '0').slice(-maxDigits))}
                  className="text-xs border-dashed border-white/20 text-white/60 hover:text-white hover:bg-white/10"
                >
                  #{num}
                </Button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Check Availability Button */}
        <Button
          onClick={handleCheckAndSelect}
          disabled={isChecking || isLoading || (mode === 'birthday' ? !birthdayDate : favoriteNumbers.length === 0)}
          size="lg"
          className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:from-pink-600 hover:via-rose-600 hover:to-pink-600 h-12 sm:h-14 text-sm sm:text-lg font-bold shadow-lg shadow-pink-500/30 text-white"
        >
          {isChecking ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-2"
              >
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
              </motion.div>
              <span className="truncate">Verificando...</span>
            </>
          ) : (
            <>
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
              <span className="truncate">Buscar mis números</span>
            </>
          )}
        </Button>

        {/* Results */}
        <AnimatePresence>
          {generatedNumbers.length > 0 && !isChecking && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="p-4 bg-white/[0.03] border-2 border-white/[0.06] rounded-xl">
                <p className="font-medium text-center text-white mb-3">
                  Resultados de búsqueda:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {generatedNumbers.map((num, index) => {
                    const isAvailable = availableNumbers.includes(num);
                    return (
                      <motion.div
                        key={num}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: index * 0.05, type: "spring" }}
                      >
                        <Badge 
                          className={cn(
                            "text-lg px-4 py-2 transition-all",
                            isAvailable 
                              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" 
                              : "bg-white/10 text-white/40 line-through"
                          )}
                        >
                          #{num}
                          {isAvailable && <Sparkles className="w-3 h-3 ml-1 inline" />}
                        </Badge>
                      </motion.div>
                    );
                  })}
                </div>
                
                <div className="flex justify-center gap-4 mt-4 text-sm">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                    Disponible ({availableNumbers.length})
                  </span>
                  <span className="flex items-center gap-1 text-white/40">
                    <span className="w-3 h-3 bg-white/20 rounded-full" />
                    No disponible ({generatedNumbers.length - availableNumbers.length})
                  </span>
                </div>
              </div>

              {availableNumbers.length > 0 && (
                <Button
                  onClick={handleSelectNumbers}
                  size="lg"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 h-12 text-white"
                >
                  Seleccionar {availableNumbers.length} número{availableNumbers.length !== 1 ? 's' : ''} disponible{availableNumbers.length !== 1 ? 's' : ''}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
    </div>
  );
}

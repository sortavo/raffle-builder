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
  isLightTemplate?: boolean;
  // Numbering config for proper validation
  numberStart?: number;
  step?: number;
  totalTickets?: number;
}

export function LuckyNumbersInput({
  maxDigits,
  onNumbersGenerated,
  checkAvailability,
  isLoading,
  showWinnersHistory = true,
  isLightTemplate = false,
  numberStart = 1,
  step = 1,
  totalTickets = 1000
}: LuckyNumbersInputProps) {
  // Calculate max valid ticket number based on numbering config
  const maxValidNumber = numberStart + (totalTickets - 1) * step;
  const [mode, setMode] = useState<'birthday' | 'favorites'>('birthday');
  const [birthdayDate, setBirthdayDate] = useState('');
  const [favoriteNumbers, setFavoriteNumbers] = useState<string[]>([]);
  const [newNumber, setNewNumber] = useState('');
  const [generatedNumbers, setGeneratedNumbers] = useState<string[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Theme-aware colors
  const colors = isLightTemplate ? {
    cardBg: 'bg-white border-gray-200',
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    textSubtle: 'text-gray-400',
    tabsBg: 'bg-gray-100',
    tabsActive: 'data-[state=active]:bg-white data-[state=active]:text-gray-900',
    tabsText: 'text-gray-500',
    inputBg: 'bg-white border-gray-200',
    inputText: 'text-gray-900',
    inputPlaceholder: 'placeholder:text-gray-400',
    previewBg: 'bg-pink-50 border-pink-200',
    previewText: 'text-pink-700',
    badgePreview: 'bg-white border-pink-300 text-pink-600',
    resultsBg: 'bg-gray-50 border-gray-200',
    suggestBtn: 'border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100',
  } : {
    cardBg: 'bg-white/[0.03] border-white/[0.06]',
    text: 'text-white',
    textMuted: 'text-white/60',
    textSubtle: 'text-white/40',
    tabsBg: 'bg-white/[0.03]',
    tabsActive: 'data-[state=active]:bg-white/10 data-[state=active]:text-white',
    tabsText: 'text-white/60',
    inputBg: 'bg-white/[0.03] border-white/[0.06]',
    inputText: 'text-white',
    inputPlaceholder: 'placeholder:text-white/40',
    previewBg: 'bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-pink-500/20',
    previewText: 'text-white/60',
    badgePreview: 'bg-white/[0.03] border-pink-500/30 text-pink-300',
    resultsBg: 'bg-white/[0.03] border-white/[0.06]',
    suggestBtn: 'border-white/20 text-white/60 hover:text-white hover:bg-white/10',
  };

  // Helper to check if a number is valid within the raffle range
  const isValidNumber = useCallback((numStr: string): boolean => {
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return false;
    
    // Check if the number is within the valid range
    if (num < numberStart || num > maxValidNumber) return false;
    
    // Check if the number aligns with the step (i.e., (num - numberStart) % step === 0)
    if (step !== 1 && (num - numberStart) % step !== 0) return false;
    
    return true;
  }, [numberStart, maxValidNumber, step]);

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
    
    // Filter to only include valid numbers within the raffle range
    return Array.from(numbers)
      .filter(n => n.length <= maxDigits && isValidNumber(n));
  }, [maxDigits, isValidNumber]);

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

      <Card className={cn("border-2 overflow-hidden backdrop-blur-sm", colors.cardBg)}>
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
          <h3 className={cn("text-xl font-bold mb-2", colors.text)}>Números de la Suerte</h3>
          <p className={colors.textMuted}>Elige números basados en fechas especiales o favoritos</p>
        </div>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className={cn("grid w-full grid-cols-2 p-1 rounded-xl", colors.tabsBg)}>
            <TabsTrigger 
              value="birthday" 
              className={cn("rounded-lg flex items-center gap-2", colors.tabsText, colors.tabsActive)}
            >
              <Cake className="w-4 h-4" />
              Cumpleaños
            </TabsTrigger>
            <TabsTrigger 
              value="favorites" 
              className={cn("rounded-lg flex items-center gap-2", colors.tabsText, colors.tabsActive)}
            >
              <Star className="w-4 h-4" />
              Favoritos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="birthday" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className={cn("flex items-center gap-2 text-base", colors.text)}>
                <Calendar className="w-4 h-4 text-pink-500" />
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
                className={cn("h-12 text-lg border-2", colors.inputBg, colors.inputText)}
              />
            </div>

            {birthdayDate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("p-4 border rounded-xl", colors.previewBg)}
              >
                <p className={cn("text-sm mb-2", colors.previewText)}>Números que se generarán:</p>
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
                        className={cn("text-sm px-3 py-1", colors.badgePreview)}
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
              <Label className={cn("flex items-center gap-2 text-base", colors.text)}>
                <Hash className="w-4 h-4 text-amber-500" />
                Agrega tus números favoritos
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`Ej: 777`}
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFavorite()}
                  className={cn("h-12 text-lg border-2", colors.inputBg, colors.inputText, colors.inputPlaceholder)}
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
              <span className={cn("text-xs w-full mb-1", colors.textSubtle)}>Números populares:</span>
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
                  className={cn("text-xs border-dashed", colors.suggestBtn)}
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
              <div className={cn("p-4 border-2 rounded-xl", colors.resultsBg)}>
                <p className={cn("font-medium text-center mb-3", colors.text)}>
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
                              : isLightTemplate 
                                ? "bg-gray-200 text-gray-400 line-through"
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
                  <span className="flex items-center gap-1 text-emerald-500">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                    Disponible ({availableNumbers.length})
                  </span>
                  <span className={cn("flex items-center gap-1", colors.textSubtle)}>
                    <span className={cn("w-3 h-3 rounded-full", isLightTemplate ? "bg-gray-300" : "bg-white/20")} />
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

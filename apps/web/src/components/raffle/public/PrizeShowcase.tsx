import { Trophy, Gift, Sparkles, Award, Star } from "lucide-react";
import { formatCurrency } from "@/lib/currency-utils";
import { PrizeDisplayMode, Prize } from "@/types/prize";
import { cn } from "@/lib/utils";

interface PrizeShowcaseProps {
  raffle: {
    prize_name: string;
    prize_value?: number | string | null;
  };
  prizes: Prize[];
  displayMode: PrizeDisplayMode;
  currency: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  textMuted: string;
  cardBg: string;
  isDarkTemplate: boolean;
  /** When true, excludes pre-draw prizes (with scheduled_draw_date) and shows only main draw prizes */
  excludePreDraws?: boolean;
}

export function PrizeShowcase({
  raffle,
  prizes,
  displayMode,
  currency,
  primaryColor,
  accentColor,
  textColor,
  textMuted,
  cardBg,
  isDarkTemplate,
  excludePreDraws = false,
}: PrizeShowcaseProps) {
  // Use prizes array if available, otherwise create from legacy fields
  let allPrizes: Prize[] = prizes.length > 0 
    ? prizes 
    : [{ id: '1', name: raffle.prize_name, value: raffle.prize_value ? Number(raffle.prize_value) : null, currency: null }];

  // If excludePreDraws, filter out prizes with scheduled_draw_date (pre-draws)
  // Keep all prizes without a scheduled date (main draw prizes)
  // If all prizes have dates, keep only the last one as the main prize
  if (excludePreDraws && allPrizes.length > 0) {
    const mainPrizes = allPrizes.filter(p => !p.scheduled_draw_date);
    allPrizes = mainPrizes.length > 0 ? mainPrizes : [allPrizes[allPrizes.length - 1]];
  }

  const containerStyle = {
    background: `linear-gradient(135deg, ${primaryColor}08 0%, ${accentColor}12 50%, ${primaryColor}08 100%)`,
    borderColor: `${primaryColor}30`,
  };

  // Hierarchical mode: Main prize + 2nd, 3rd place, etc. - CLEANED UP VERSION
  if (displayMode === 'hierarchical') {
    return (
      <div 
        className="relative overflow-hidden rounded-2xl border-2 p-4 sm:p-6 max-w-2xl mx-auto"
        style={containerStyle}
      >
        {/* Decorative sparkles - using icon instead of emoji */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
          <Sparkles className={cn(
            "w-5 h-5 sm:w-6 sm:h-6 animate-pulse",
            isDarkTemplate ? "text-amber-400" : "text-amber-500"
          )} />
        </div>
        
        {/* Main Prize */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div 
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
            style={{ 
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
            }}
          >
            <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p 
              className="text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"
              style={{ color: primaryColor }}
            >
              <Award className="w-3.5 h-3.5" />
              Premio Principal
            </p>
            <h2 
              className="text-lg sm:text-xl lg:text-2xl font-bold leading-tight"
              style={{ color: textColor }}
            >
              {allPrizes[0]?.name || raffle.prize_name}
            </h2>
            {(allPrizes[0]?.value || raffle.prize_value) && (
              <p 
                className="text-sm mt-1"
                style={{ color: textMuted }}
              >
                Valor estimado: {formatCurrency(Number(allPrizes[0]?.value || raffle.prize_value), currency)}
              </p>
            )}
          </div>
        </div>
        
        {/* Additional Prizes */}
        {allPrizes.length > 1 && (
          <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t" style={{ borderColor: `${primaryColor}20` }}>
            <p className="text-xs font-medium mb-3 flex items-center gap-2" style={{ color: textMuted }}>
              <Gift className="w-4 h-4" style={{ color: primaryColor }} />
              También puedes ganar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {allPrizes.slice(1).map((prize, idx) => {
                // Use icons instead of emojis, more muted colors
                const badgeStyles = [
                  { bg: `linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)`, label: '2° Lugar' },
                  { bg: `linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)`, label: '3° Lugar' },
                  { bg: `linear-gradient(135deg, ${primaryColor}90 0%, ${accentColor}90 100%)`, label: `${idx + 2}° Premio` },
                ];
                const style = badgeStyles[Math.min(idx, 2)];
                
                return (
                  <div 
                    key={prize.id || idx}
                    className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border"
                    style={{ 
                      backgroundColor: isDarkTemplate ? cardBg : 'rgba(255,255,255,0.9)',
                      borderColor: `${primaryColor}15`,
                    }}
                  >
                    <div 
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: style.bg }}
                    >
                      <Star className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs font-medium" style={{ color: textMuted }}>
                        {style.label}
                      </p>
                      <p className="text-sm font-semibold truncate" style={{ color: textColor }}>
                        {prize.name}
                      </p>
                      {prize.value && (
                        <p className="text-[10px] sm:text-xs" style={{ color: textMuted }}>
                          Valor estimado: {formatCurrency(prize.value, currency)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Equal mode: All prizes shown with same visual weight - CLEANED UP VERSION
  if (displayMode === 'equal') {
    return (
      <div 
        className="relative overflow-hidden rounded-2xl border-2 p-4 sm:p-6 max-w-2xl mx-auto"
        style={containerStyle}
      >
        {/* Decorative sparkles */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
          <Sparkles className={cn(
            "w-5 h-5 sm:w-6 sm:h-6 animate-pulse",
            isDarkTemplate ? "text-amber-400" : "text-amber-500"
          )} />
        </div>
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div 
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
            style={{ 
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
            }}
          >
            <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <p 
              className="text-xs sm:text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: primaryColor }}
            >
              <Star className="w-3.5 h-3.5" />
              Premios del Sorteo
            </p>
            <p className="text-xs" style={{ color: textMuted }}>
              Todos tienen la misma oportunidad
            </p>
          </div>
        </div>
        
        {/* All Prizes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {allPrizes.map((prize, idx) => (
            <div 
              key={prize.id || idx}
              className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ 
                backgroundColor: isDarkTemplate ? cardBg : 'rgba(255,255,255,0.9)',
                borderColor: `${primaryColor}15`,
              }}
            >
              <div 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor}15 0%, ${accentColor}15 100%)`,
                }}
              >
                <Gift className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: primaryColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: textColor }}>
                  {prize.name}
                </p>
                {prize.value && (
                  <p className="text-xs" style={{ color: textMuted }}>
                    Valor estimado: {formatCurrency(prize.value, currency)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Numbered mode: Prize 1, 2, 3... without hierarchy medals - CLEANED UP VERSION
  return (
    <div 
      className="relative overflow-hidden rounded-2xl border-2 p-4 sm:p-6 max-w-2xl mx-auto"
      style={containerStyle}
    >
      {/* Decorative sparkles */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
        <Sparkles className={cn(
          "w-5 h-5 sm:w-6 sm:h-6 animate-pulse",
          isDarkTemplate ? "text-amber-400" : "text-amber-500"
        )} />
      </div>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-5">
        <div 
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
          style={{ 
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
          }}
        >
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <p 
            className="text-xs sm:text-sm font-semibold uppercase tracking-wider"
            style={{ color: primaryColor }}
          >
            Premios
          </p>
          <p className="text-xs" style={{ color: textMuted }}>
            {allPrizes.length} premio{allPrizes.length > 1 ? 's' : ''} a sortear
          </p>
        </div>
      </div>
      
      {/* Numbered Prizes - using number badges instead of emojis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {allPrizes.map((prize, idx) => (
          <div 
            key={prize.id || idx}
            className="flex items-center gap-3 p-3 rounded-xl border"
            style={{ 
              backgroundColor: isDarkTemplate ? cardBg : 'rgba(255,255,255,0.9)',
              borderColor: `${primaryColor}15`,
            }}
          >
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
              }}
            >
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium" style={{ color: textMuted }}>
                Premio {idx + 1}
              </p>
              <p className="text-sm font-semibold truncate" style={{ color: textColor }}>
                {prize.name}
              </p>
              {prize.value && (
                <p className="text-xs" style={{ color: textMuted }}>
                  Valor estimado: {formatCurrency(prize.value, currency)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

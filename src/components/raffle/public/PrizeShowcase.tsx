import { Trophy, Gift, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/currency-utils";
import { PrizeDisplayMode, Prize } from "@/types/prize";

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
}: PrizeShowcaseProps) {
  // Use prizes array if available, otherwise create from legacy fields
  const allPrizes: Prize[] = prizes.length > 0 
    ? prizes 
    : [{ id: '1', name: raffle.prize_name, value: raffle.prize_value ? Number(raffle.prize_value) : null, currency: null }];

  const containerStyle = {
    background: `linear-gradient(135deg, ${primaryColor}08 0%, ${accentColor}12 50%, ${primaryColor}08 100%)`,
    borderColor: `${primaryColor}30`,
  };

  // Hierarchical mode: Main prize + 2nd, 3rd place, etc.
  if (displayMode === 'hierarchical') {
    return (
      <div 
        className="relative overflow-hidden rounded-2xl border-2 p-4 sm:p-6"
        style={containerStyle}
      >
        {/* Decorative sparkles */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 animate-pulse" />
        </div>
        
        {/* Main Prize */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div 
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ 
              background: `linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)`,
            }}
          >
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p 
              className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-1"
              style={{ color: '#D97706' }}
            >
              🏆 Premio Principal
            </p>
            <h2 
              className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight"
              style={{ color: textColor }}
            >
              {allPrizes[0]?.name || raffle.prize_name}
            </h2>
            {(allPrizes[0]?.value || raffle.prize_value) && (
              <p 
                className="text-base sm:text-lg font-semibold mt-1"
                style={{ color: '#D97706' }}
              >
                Valor: {formatCurrency(Number(allPrizes[0]?.value || raffle.prize_value), currency)}
              </p>
            )}
          </div>
        </div>
        
        {/* Additional Prizes */}
        {allPrizes.length > 1 && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t" style={{ borderColor: `${primaryColor}20` }}>
            <p className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4 flex items-center gap-2" style={{ color: textMuted }}>
              <Gift className="w-4 h-4" style={{ color: primaryColor }} />
              ¡Y también puedes ganar!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {allPrizes.slice(1).map((prize, idx) => {
                const badgeStyles = [
                  { bg: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)', icon: '🥈', label: '2° Lugar' },
                  { bg: 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)', icon: '🥉', label: '3° Lugar' },
                  { bg: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`, icon: '🎁', label: `${idx + 2}° Premio` },
                ];
                const style = badgeStyles[Math.min(idx, 2)];
                
                return (
                  <div 
                    key={prize.id || idx}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl border shadow-sm"
                    style={{ 
                      backgroundColor: isDarkTemplate ? cardBg : 'rgba(255,255,255,0.8)',
                      borderColor: `${primaryColor}15`,
                    }}
                  >
                    <div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ background: style.bg }}
                    >
                      <span className="text-base sm:text-lg">{style.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs font-medium" style={{ color: textMuted }}>
                        {style.label}
                      </p>
                      <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: textColor }}>
                        {prize.name}
                      </p>
                      {prize.value && (
                        <p className="text-[10px] sm:text-xs" style={{ color: textMuted }}>
                          Valor: {formatCurrency(prize.value, currency)}
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

  // Equal mode: All prizes shown with same visual weight
  if (displayMode === 'equal') {
    return (
      <div 
        className="relative overflow-hidden rounded-2xl border-2 p-4 sm:p-6"
        style={containerStyle}
      >
        {/* Decorative sparkles */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 animate-pulse" />
        </div>
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ 
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
            }}
          >
            <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <p 
              className="text-xs sm:text-sm font-bold uppercase tracking-wider"
              style={{ color: primaryColor }}
            >
              🎁 Premios del Sorteo
            </p>
            <p className="text-xs" style={{ color: textMuted }}>
              ¡Todos tienen la misma oportunidad!
            </p>
          </div>
        </div>
        
        {/* All Prizes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allPrizes.map((prize, idx) => (
            <div 
              key={prize.id || idx}
              className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border shadow-sm"
              style={{ 
                backgroundColor: isDarkTemplate ? cardBg : 'rgba(255,255,255,0.9)',
                borderColor: `${primaryColor}20`,
              }}
            >
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor}20 0%, ${accentColor}20 100%)`,
                }}
              >
                <span className="text-xl sm:text-2xl">🎁</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-semibold truncate" style={{ color: textColor }}>
                  {prize.name}
                </p>
                {prize.value && (
                  <p className="text-xs sm:text-sm" style={{ color: textMuted }}>
                    Valor: {formatCurrency(prize.value, currency)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Numbered mode: Prize 1, 2, 3... without hierarchy medals
  return (
    <div 
      className="relative overflow-hidden rounded-2xl border-2 p-4 sm:p-6"
      style={containerStyle}
    >
      {/* Decorative sparkles */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 animate-pulse" />
      </div>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div 
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
          style={{ 
            background: `linear-gradient(135deg, #FFD700 0%, #FFA500 100%)`,
          }}
        >
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <p 
            className="text-xs sm:text-sm font-bold uppercase tracking-wider"
            style={{ color: '#D97706' }}
          >
            🎰 Premios
          </p>
          <p className="text-xs" style={{ color: textMuted }}>
            {allPrizes.length} premio{allPrizes.length > 1 ? 's' : ''} a sortear
          </p>
        </div>
      </div>
      
      {/* Numbered Prizes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allPrizes.map((prize, idx) => {
          const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
          const emoji = numberEmojis[idx] || `#${idx + 1}`;
          
          return (
            <div 
              key={prize.id || idx}
              className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border shadow-sm"
              style={{ 
                backgroundColor: isDarkTemplate ? cardBg : 'rgba(255,255,255,0.9)',
                borderColor: `${primaryColor}20`,
              }}
            >
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor}15 0%, ${accentColor}15 100%)`,
                }}
              >
                <span className="text-xl sm:text-2xl">{emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium" style={{ color: textMuted }}>
                  Premio {idx + 1}
                </p>
                <p className="text-sm sm:text-base font-semibold truncate" style={{ color: textColor }}>
                  {prize.name}
                </p>
                {prize.value && (
                  <p className="text-xs sm:text-sm" style={{ color: textMuted }}>
                    Valor: {formatCurrency(prize.value, currency)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

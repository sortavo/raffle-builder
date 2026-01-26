import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Search, 
  Mail, 
  Phone, 
  Hash, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRaffleTicketVerification, VerificationSearchType, VerificationResult } from "@/hooks/useRaffleTicketVerification";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TicketVerificationSectionProps {
  raffleId: string;
  raffleSlug: string;
  organizationSlug?: string;
  isLightTemplate?: boolean;
  primaryColor?: string;
  numberStart?: number;
  totalTickets?: number;
}

const searchTabs: { type: VerificationSearchType; label: string; icon: typeof Mail; placeholder: string }[] = [
  { type: 'email', label: 'Email', icon: Mail, placeholder: 'tu@correo.com' },
  { type: 'phone', label: 'Teléfono', icon: Phone, placeholder: '55 1234 5678' },
  { type: 'reference', label: 'Código', icon: Hash, placeholder: 'ABCD1234' },
];

// Helper to mask email for privacy
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 3 
    ? `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 5))}` 
    : local;
  return `${maskedLocal}@${domain}`;
}

// Helper to format ticket ranges or lucky_indices into display numbers
function formatTicketNumbers(
  ranges: { s: number; e: number }[] | null,
  luckyIndices: number[] | null,
  numberStart: number = 1,
  totalTickets: number = 1000
): string {
  const padding = String(totalTickets + numberStart - 1).length;
  const maxShow = 6;

  // If we have lucky_indices, use them directly
  if (luckyIndices && luckyIndices.length > 0) {
    const sortedSample = [...luckyIndices].slice(0, maxShow).sort((a, b) => a - b);
    const tickets = sortedSample.map(idx => 
      String(numberStart + idx).padStart(padding, '0')
    );
    
    if (luckyIndices.length > maxShow) {
      return `#${tickets.join(', #')} y ${luckyIndices.length - maxShow} más`;
    }
    return `#${tickets.join(', #')}`;
  }

  // If we have ticket_ranges, use existing logic
  if (ranges && ranges.length > 0) {
    const tickets: string[] = [];
    let count = 0;
    
    for (const range of ranges) {
      for (let i = range.s; i <= range.e && count < maxShow; i++) {
        const ticketNum = numberStart + i;
        tickets.push(String(ticketNum).padStart(padding, '0'));
        count++;
      }
      if (count >= maxShow) break;
    }
    
    const totalCount = ranges.reduce((sum, r) => sum + (r.e - r.s + 1), 0);
    if (totalCount > maxShow) {
      return `#${tickets.join(', #')} y ${totalCount - maxShow} más`;
    }
    
    return `#${tickets.join(', #')}`;
  }
  
  return 'Sin boletos';
}

function OrderResultCard({ 
  order, 
  isLightTemplate, 
  primaryColor,
  numberStart,
  totalTickets,
  organizationSlug,
  raffleSlug
}: { 
  order: VerificationResult; 
  isLightTemplate: boolean; 
  primaryColor: string;
  numberStart: number;
  totalTickets: number;
  organizationSlug?: string;
  raffleSlug: string;
}) {
  const statusConfig = {
    sold: { 
      label: 'Confirmado', 
      icon: CheckCircle2, 
      color: 'text-emerald-500',
      bgColor: isLightTemplate ? 'bg-emerald-50' : 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    },
    pending: { 
      label: 'Pendiente de Pago', 
      icon: Clock, 
      color: 'text-amber-500',
      bgColor: isLightTemplate ? 'bg-amber-50' : 'bg-amber-500/10',
      borderColor: 'border-amber-500/20'
    },
    reserved: { 
      label: 'Reservado', 
      icon: Clock, 
      color: 'text-blue-500',
      bgColor: isLightTemplate ? 'bg-blue-50' : 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
  };

  const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;
  
  const dateToShow = order.sold_at || order.reserved_at || order.created_at;
  const formattedDate = dateToShow 
    ? format(new Date(dateToShow), "d 'de' MMMM, yyyy", { locale: es })
    : '';

  // Build detail URL
  const detailUrl = organizationSlug 
    ? `/${organizationSlug}/${raffleSlug}/order/${order.reference_code}`
    : `/r/${raffleSlug}/order/${order.reference_code}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border p-4 sm:p-5",
        isLightTemplate 
          ? "bg-white border-gray-200 shadow-sm" 
          : "bg-white/[0.03] border-white/[0.08]"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            config.bgColor
          )}>
            <StatusIcon className={cn("w-5 h-5", config.color)} />
          </div>
          <div>
            <p className={cn(
              "font-semibold text-sm",
              isLightTemplate ? "text-gray-900" : "text-white"
            )}>
              Orden: {order.reference_code}
            </p>
            <p className={cn(
              "text-xs",
              isLightTemplate ? "text-gray-500" : "text-white/50"
            )}>
              {formattedDate}
            </p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "self-start",
            config.bgColor,
            config.borderColor,
            config.color
          )}
        >
          {config.label}
        </Badge>
      </div>

      <div className={cn(
        "rounded-lg p-3 mb-4",
        isLightTemplate ? "bg-gray-50" : "bg-white/[0.02]"
      )}>
        <p className={cn(
          "text-xs font-medium mb-1",
          isLightTemplate ? "text-gray-500" : "text-white/40"
        )}>
          Boletos ({order.ticket_count})
        </p>
        <p className={cn(
          "text-sm font-mono",
          isLightTemplate ? "text-gray-900" : "text-white"
        )}>
          {formatTicketNumbers(order.ticket_ranges, order.lucky_indices, numberStart, totalTickets)}
        </p>
      </div>

      {order.buyer_name && (
        <p className={cn(
          "text-xs mb-3",
          isLightTemplate ? "text-gray-500" : "text-white/50"
        )}>
          A nombre de: <span className={isLightTemplate ? "text-gray-700" : "text-white/70"}>{order.buyer_name}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          className={cn(
            "text-xs",
            isLightTemplate 
              ? "border-gray-200 hover:bg-gray-50" 
              : "border-white/10 hover:bg-white/5"
          )}
        >
          <a href={detailUrl} target="_blank" rel="noopener noreferrer">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Ver Detalle
            <ExternalLink className="w-3 h-3 ml-1.5 opacity-50" />
          </a>
        </Button>
      </div>
    </motion.div>
  );
}

export function TicketVerificationSection({
  raffleId,
  raffleSlug,
  organizationSlug,
  isLightTemplate = false,
  primaryColor = "#6366f1",
  numberStart = 1,
  totalTickets = 1000,
}: TicketVerificationSectionProps) {
  const [activeTab, setActiveTab] = useState<VerificationSearchType>('email');
  const [searchValue, setSearchValue] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  
  const { data: results, isLoading, error, isFetched } = useRaffleTicketVerification(
    raffleId,
    submittedSearch,
    activeTab
  );

  const handleSearch = () => {
    if (searchValue.trim().length >= 3) {
      setSubmittedSearch(searchValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleTabChange = (type: VerificationSearchType) => {
    setActiveTab(type);
    setSearchValue('');
    setSubmittedSearch('');
  };

  const showResults = isFetched && submittedSearch.length >= 3;
  const hasResults = results && results.length > 0;

  return (
    <section className={cn(
      "py-16 lg:py-20 border-y",
      isLightTemplate 
        ? "bg-gradient-to-b from-gray-50 to-white border-gray-200" 
        : "bg-gradient-to-b from-white/[0.02] to-transparent border-white/[0.06]"
    )}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
            style={{ 
              backgroundColor: isLightTemplate 
                ? `${primaryColor}10` 
                : `${primaryColor}20` 
            }}
          >
            <ShieldCheck 
              className="w-4 h-4" 
              style={{ color: primaryColor }} 
            />
            <span 
              className="text-xs font-medium"
              style={{ color: primaryColor }}
            >
              Verificador 24/7
            </span>
          </div>
          
          <h2 className={cn(
            "text-2xl lg:text-3xl font-bold mb-3",
            isLightTemplate ? "text-gray-900" : "text-white"
          )}>
            Verifica tu Compra
          </h2>
          <p className={cn(
            "text-sm lg:text-base max-w-md mx-auto",
            isLightTemplate ? "text-gray-500" : "text-white/50"
          )}>
            Confirma que tus boletos están registrados correctamente
          </p>
        </motion.div>

        {/* Search Card */}
        <Card className={cn(
          "border",
          isLightTemplate 
            ? "bg-white border-gray-200 shadow-lg shadow-gray-100/50" 
            : "bg-white/[0.03] border-white/[0.08] backdrop-blur-sm"
        )}>
          <CardContent className="p-4 sm:p-6">
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg mb-5"
              style={{ 
                backgroundColor: isLightTemplate 
                  ? 'rgb(243 244 246)' 
                  : 'rgba(255,255,255,0.05)' 
              }}
            >
              {searchTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.type;
                return (
                  <button
                    key={tab.type}
                    onClick={() => handleTabChange(tab.type)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all",
                      isActive 
                        ? "shadow-sm" 
                        : isLightTemplate 
                          ? "text-gray-500 hover:text-gray-700" 
                          : "text-white/50 hover:text-white/70"
                    )}
                    style={isActive ? { 
                      backgroundColor: isLightTemplate ? 'white' : 'rgba(255,255,255,0.1)',
                      color: primaryColor 
                    } : {}}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={activeTab === 'email' ? 'email' : 'text'}
                  placeholder={searchTabs.find(t => t.type === activeTab)?.placeholder}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "pr-10",
                    isLightTemplate 
                      ? "bg-white border-gray-200" 
                      : "bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30"
                  )}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searchValue.trim().length < 3 || isLoading}
                style={{ backgroundColor: primaryColor }}
                className="px-4 sm:px-6"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Buscar</span>
                  </>
                )}
              </Button>
            </div>

            {searchValue.length > 0 && searchValue.length < 3 && (
              <p className={cn(
                "text-xs mt-2",
                isLightTemplate ? "text-gray-400" : "text-white/30"
              )}>
                Escribe al menos 3 caracteres para buscar
              </p>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4"
          >
            {hasResults ? (
              <>
                <p className={cn(
                  "text-sm font-medium",
                  isLightTemplate ? "text-gray-700" : "text-white/70"
                )}>
                  {results.length} {results.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                </p>
                {results.map((order) => (
                  <OrderResultCard
                    key={order.id}
                    order={order}
                    isLightTemplate={isLightTemplate}
                    primaryColor={primaryColor}
                    numberStart={numberStart}
                    totalTickets={totalTickets}
                    organizationSlug={organizationSlug}
                    raffleSlug={raffleSlug}
                  />
                ))}
              </>
            ) : (
              <Card className={cn(
                "border",
                isLightTemplate 
                  ? "bg-amber-50 border-amber-200" 
                  : "bg-amber-500/10 border-amber-500/20"
              )}>
                <CardContent className="p-5 text-center">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
                  <p className={cn(
                    "font-medium mb-1",
                    isLightTemplate ? "text-amber-800" : "text-amber-400"
                  )}>
                    No encontramos resultados
                  </p>
                  <p className={cn(
                    "text-sm",
                    isLightTemplate ? "text-amber-700" : "text-amber-400/70"
                  )}>
                    Verifica que el {activeTab === 'email' ? 'correo' : activeTab === 'phone' ? 'teléfono' : 'código'} sea correcto o intenta con otro método de búsqueda.
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}

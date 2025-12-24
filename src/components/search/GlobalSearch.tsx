import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Gift, Users, Ticket, Plus, Settings, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SearchResult {
  id: string;
  type: 'raffle' | 'buyer' | 'ticket';
  title: string;
  subtitle?: string;
  link: string;
}

// Highlight matching text in search results
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-primary/20 text-primary rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const { organization } = useAuth();

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2 || !organization?.id) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      await performSearch(query);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, organization?.id]);

  const performSearch = async (searchQuery: string) => {
    if (!organization?.id) return;
    
    const searchResults: SearchResult[] = [];

    try {
      // Search raffles
      const { data: raffles } = await supabase
        .from('raffles')
        .select('id, title, prize_name, status, total_tickets')
        .eq('organization_id', organization.id)
        .or(`title.ilike.%${searchQuery}%,prize_name.ilike.%${searchQuery}%`)
        .limit(5);

      raffles?.forEach(raffle => {
        searchResults.push({
          id: raffle.id,
          type: 'raffle',
          title: raffle.title,
          subtitle: `${raffle.prize_name} • ${raffle.status}`,
          link: `/dashboard/raffles/${raffle.id}`,
        });
      });

      // Search buyers by name or email - first get raffle IDs for this org
      const { data: orgRaffles } = await supabase
        .from('raffles')
        .select('id')
        .eq('organization_id', organization.id);

      if (orgRaffles && orgRaffles.length > 0) {
        const raffleIds = orgRaffles.map(r => r.id);
        
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id, ticket_number, buyer_name, buyer_email, raffle_id')
          .in('raffle_id', raffleIds)
          .eq('status', 'sold')
          .or(`buyer_name.ilike.%${searchQuery}%,buyer_email.ilike.%${searchQuery}%`)
          .limit(5);

        tickets?.forEach(ticket => {
          searchResults.push({
            id: ticket.id,
            type: 'buyer',
            title: ticket.buyer_name || ticket.buyer_email || 'Comprador',
            subtitle: `Boleto #${ticket.ticket_number}`,
            link: `/dashboard/raffles/${ticket.raffle_id}?tab=buyers`,
          });
        });

        // Search by ticket number if query is numeric
        if (/^\d+$/.test(searchQuery)) {
          const { data: ticketsByNumber } = await supabase
            .from('tickets')
            .select('id, ticket_number, buyer_name, status, raffle_id')
            .in('raffle_id', raffleIds)
            .eq('ticket_number', searchQuery)
            .limit(5);

          ticketsByNumber?.forEach(ticket => {
            searchResults.push({
              id: ticket.id,
              type: 'ticket',
              title: `Boleto #${ticket.ticket_number}`,
              subtitle: `${ticket.status === 'sold' ? '✅ Vendido' : ticket.status === 'reserved' ? '⏳ Reservado' : '⭕ Disponible'}`,
              link: `/dashboard/raffles/${ticket.raffle_id}?tab=tickets`,
            });
          });
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const saveSearch = useCallback((searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent-searches', JSON.stringify(updated));
  }, [recentSearches]);

  const handleSelect = (result: SearchResult) => {
    saveSearch(query);
    setOpen(false);
    setQuery('');
    navigate(result.link);
  };

  const handleQuickAction = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'raffle':
        return <Gift className="h-4 w-4 text-primary" />;
      case 'buyer':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'ticket':
        return <Ticket className="h-4 w-4 text-green-500" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Buscar...
        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Command dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar sorteos, compradores, boletos..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isSearching && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Buscando...
            </div>
          )}

          {!isSearching && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>No se encontraron resultados para "{query}"</CommandEmpty>
          )}

          {!isSearching && results.length > 0 && (
            <>
              {/* Raffles */}
              {results.some(r => r.type === 'raffle') && (
                <CommandGroup heading="Sorteos">
                  {results.filter(r => r.type === 'raffle').map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="cursor-pointer"
                    >
                      {getResultIcon(result.type)}
                      <div className="ml-2 flex-1">
                        <p className="text-sm font-medium">
                          <HighlightText text={result.title} query={query} />
                        </p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground">
                            <HighlightText text={result.subtitle} query={query} />
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Buyers */}
              {results.some(r => r.type === 'buyer') && (
                <CommandGroup heading="Compradores">
                  {results.filter(r => r.type === 'buyer').map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="cursor-pointer"
                    >
                      {getResultIcon(result.type)}
                      <div className="ml-2 flex-1">
                        <p className="text-sm font-medium">
                          <HighlightText text={result.title} query={query} />
                        </p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground">
                            <HighlightText text={result.subtitle} query={query} />
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Tickets */}
              {results.some(r => r.type === 'ticket') && (
                <CommandGroup heading="Boletos">
                  {results.filter(r => r.type === 'ticket').map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="cursor-pointer"
                    >
                      {getResultIcon(result.type)}
                      <div className="ml-2 flex-1">
                        <p className="text-sm font-medium">
                          <HighlightText text={result.title} query={query} />
                        </p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground">
                            <HighlightText text={result.subtitle} query={query} />
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}

          {/* Recent searches when no query */}
          {!query && recentSearches.length > 0 && (
            <CommandGroup heading="Búsquedas recientes">
              {recentSearches.map((search, index) => (
                <CommandItem
                  key={index}
                  onSelect={() => setQuery(search)}
                  className="cursor-pointer"
                >
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  {search}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick actions when no query */}
          {!query && (
            <CommandGroup heading="Acciones rápidas">
              <CommandItem onSelect={() => handleQuickAction('/dashboard/raffles/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Crear nuevo sorteo
              </CommandItem>
              <CommandItem onSelect={() => handleQuickAction('/dashboard/raffles')}>
                <Gift className="mr-2 h-4 w-4" />
                Ver todos los sorteos
              </CommandItem>
              <CommandItem onSelect={() => handleQuickAction('/dashboard/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

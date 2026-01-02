import { UseFormReturn } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RAFFLE_CATEGORIES, generateSlug } from '@/lib/raffle-utils';
import { cn } from '@/lib/utils';
import { REQUIRED_FIELDS } from '@/hooks/useWizardValidation';
import { useState, useEffect } from 'react';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { supabase } from '@/integrations/supabase/client';
import { validateSlugFormat, normalizeToSlug } from '@/lib/url-utils';
import { AlertCircle, CheckCircle2, Loader2, Sparkles, Link2, Globe, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
interface Step1Props {
  form: UseFormReturn<any>;
}

export const Step1BasicInfo = ({ form }: Step1Props) => {
  const { id } = useParams();
  const isEditing = !!id;
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const { organization: authOrg } = useEffectiveAuth();
  const [debouncedSlug, setDebouncedSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  const { data: organization } = useQuery({
    queryKey: ['organization-slug', authOrg?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', authOrg!.id)
        .single();
      return data;
    },
    enabled: !!authOrg?.id,
  });

  // Fetch verified custom domains
  const { data: customDomains } = useQuery({
    queryKey: ['custom-domains-verified', authOrg?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('custom_domains')
        .select('domain, is_primary')
        .eq('organization_id', authOrg!.id)
        .eq('verified', true)
        .order('is_primary', { ascending: false });
      return data;
    },
    enabled: !!authOrg?.id,
  });

  const primaryCustomDomain = customDomains?.[0]?.domain;

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  // Fetch raffle status to determine if slug can be edited
  const { data: raffleData } = useQuery({
    queryKey: ['raffle-status', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('raffles')
        .select('status')
        .eq('id', id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const raffleStatus = raffleData?.status;
  const canEditSlug = !isEditing || raffleStatus === 'draft';

  const raffleSlug = form.watch('slug') || 'tu-sorteo';
  const orgSlug = organization?.slug || 'org';

  // Debounce slug changes for validation
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSlug(raffleSlug);
    }, 500);
    return () => clearTimeout(timer);
  }, [raffleSlug]);

  // Check for duplicate slug
  const { data: slugCheck, isLoading: isCheckingSlug } = useQuery({
    queryKey: ['check-slug-duplicate', authOrg?.id, debouncedSlug, id],
    queryFn: async () => {
      if (!debouncedSlug || debouncedSlug === 'tu-sorteo') {
        return { isDuplicate: false };
      }
      
      let query = supabase
        .from('raffles')
        .select('id, slug')
        .eq('organization_id', authOrg!.id)
        .eq('slug', debouncedSlug);
      
      // Exclude current raffle when editing
      if (id) {
        query = query.neq('id', id);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) {
        console.error('Error checking slug:', error);
        return { isDuplicate: false };
      }
      
      return { isDuplicate: !!data };
    },
    enabled: !!authOrg?.id && !!debouncedSlug && debouncedSlug !== 'tu-sorteo',
  });

  const isDuplicateSlug = slugCheck?.isDuplicate ?? false;

  const handleTitleChange = (value: string) => {
    form.setValue('title', value);
    // Only auto-generate slug if not manually edited and for new raffles
    if (!isSlugManuallyEdited && !isEditing) {
      form.setValue('slug', generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    // Normalize input: convert to lowercase and replace spaces
    const normalized = normalizeToSlug(value);
    form.setValue('slug', normalized);
    setIsSlugManuallyEdited(true);
  };

  const slugFormatError = validateSlugFormat(raffleSlug === 'tu-sorteo' ? '' : raffleSlug);

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: string): string | null => {
    if (!touchedFields[field]) return null;
    const value = form.watch(field);
    
    if (field === 'title') {
      if (!value || value.trim().length < 3) {
        return REQUIRED_FIELDS.title.message;
      }
    }
    return null;
  };

  const titleError = getFieldError('title');

  const handleGenerateTitle = async () => {
    setIsGeneratingTitle(true);
    try {
      const category = form.watch('category');
      const prizeName = form.watch('prizeName');
      const currentTitle = form.watch('title');

      const response = await supabase.functions.invoke('generate-description', {
        body: {
          type: 'title',
          category,
          prizeName,
          userContext: currentTitle,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al generar título');
      }

      const { title } = response.data;
      if (title) {
        handleTitleChange(title);
        toast.success('¡Título generado con IA!');
      }
    } catch (error) {
      console.error('Error generating title:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar el título');
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleGenerateDescription = async () => {
    const title = form.watch('title');
    if (!title || title.trim().length < 3) {
      toast.error('Ingresa un título primero para generar la descripción');
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const category = form.watch('category');
      const prizeName = form.watch('prizeName');
      const currentDescription = form.watch('description');

      const response = await supabase.functions.invoke('generate-description', {
        body: {
          type: 'description',
          title,
          category,
          prizeName,
          userContext: currentDescription,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al generar descripción');
      }

      const { description } = response.data;
      if (description) {
        form.setValue('description', description);
        toast.success('¡Descripción generada con IA!');
      }
    } catch (error) {
      console.error('Error generating description:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar la descripción');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const renderSlugStatus = () => {
    // Show format error first
    if (slugFormatError && raffleSlug !== 'tu-sorteo') {
      return (
        <span className="flex items-center gap-1 text-destructive text-sm font-medium">
          <AlertCircle className="h-3 w-3" />
          {slugFormatError}
        </span>
      );
    }

    if (!debouncedSlug || debouncedSlug === 'tu-sorteo') return null;
    
    if (isCheckingSlug) {
      return (
        <span className="flex items-center gap-1 text-muted-foreground text-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          Verificando disponibilidad...
        </span>
      );
    }
    
    if (isDuplicateSlug) {
      return (
        <span className="flex items-center gap-1 text-destructive text-sm font-medium">
          <AlertCircle className="h-3 w-3" />
          Esta URL ya está en uso
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-1 text-green-600 text-sm">
        <CheckCircle2 className="h-3 w-3" />
        URL disponible
      </span>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Premium Section Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight">Información Básica</h2>
          <p className="text-sm text-muted-foreground">Define el título y descripción de tu sorteo</p>
        </div>
      </div>
      
      <div className="space-y-5 md:space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                <FormLabel className="flex items-center gap-1">
                  Título del Sorteo
                  <span className="text-destructive">*</span>
                </FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateTitle}
                  disabled={isGeneratingTitle}
                  className="h-8 gap-1.5 text-xs w-full sm:w-auto"
                >
                  {isGeneratingTitle ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Generar con IA
                    </>
                  )}
                </Button>
              </div>
              <FormControl>
                <Input 
                  placeholder="Ej: Gran Sorteo de Navidad" 
                  {...field}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={() => handleBlur('title')}
                  className={cn(
                    "h-11 md:h-10",
                    titleError && "border-destructive focus-visible:ring-destructive"
                  )}
                />
              </FormControl>
              {titleError && (
                <p className="text-sm font-medium text-destructive">{titleError}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Slug field - clean input with URL previews */}
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                URL del Sorteo
                <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input 
                  {...field}
                  value={field.value || ''}
                  placeholder="mi-sorteo-increible"
                  onChange={(e) => handleSlugChange(e.target.value)}
                  onBlur={() => handleBlur('slug')}
                  disabled={!canEditSlug}
                  maxLength={100}
                  className={cn(
                    "h-11 md:h-10",
                    (slugFormatError || isDuplicateSlug) && "border-destructive focus-visible:ring-destructive"
                  )}
                />
              </FormControl>
              
              <FormDescription className="flex flex-col gap-1">
                {!canEditSlug ? (
                  <span className="flex items-center gap-1 text-muted-foreground text-sm">
                    <AlertCircle className="h-3 w-3" />
                    La URL no se puede cambiar después de publicar
                  </span>
                ) : (
                  <>
                    <span className="text-muted-foreground text-xs md:text-sm">
                      Solo letras minúsculas, números y guiones (3-100 caracteres)
                    </span>
                    {renderSlugStatus()}
                  </>
                )}
              </FormDescription>
              
              {/* URL Previews */}
              {raffleSlug && raffleSlug !== 'tu-sorteo' && !slugFormatError && !isDuplicateSlug && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">
                    URLs donde estará disponible tu sorteo:
                  </p>
                  
                  {/* Sortavo URL */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border text-sm">
                    <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-muted-foreground">
                      sortavo.com/{orgSlug}/{raffleSlug}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyToClipboard(`https://sortavo.com/${orgSlug}/${raffleSlug}`)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      asChild
                    >
                      <a 
                        href={`https://sortavo.com/${orgSlug}/${raffleSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                  
                  {/* Custom Domain URL */}
                  {primaryCustomDomain && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-md border border-emerald-200 dark:border-emerald-800 text-sm">
                      <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate flex-1 text-emerald-700 dark:text-emerald-400">
                        {primaryCustomDomain}/{raffleSlug}
                      </span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Personalizado
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => copyToClipboard(`https://${primaryCustomDomain}/${raffleSlug}`)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        asChild
                      >
                        <a 
                          href={`https://${primaryCustomDomain}/${raffleSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                <FormLabel>Descripción</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription || !form.watch('title')?.trim()}
                  className="h-8 gap-1.5 text-xs w-full sm:w-auto"
                >
                  {isGeneratingDescription ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Generar con IA
                    </>
                  )}
                </Button>
              </div>
              <FormControl>
                <Textarea 
                  placeholder="💡 Para una mejor descripción incluye: qué se rifa, qué hace especial al premio, cómo participar, fechas importantes, y por qué no deberían perdérselo..."
                  className="min-h-[100px] md:min-h-[120px] text-base"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs md:text-sm">
                Tip: Escribe algunos detalles y la IA los usará para crear una descripción más completa
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 md:h-10">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RAFFLE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
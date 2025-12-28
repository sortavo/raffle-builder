import { UseFormReturn } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RAFFLE_CATEGORIES, generateSlug } from '@/lib/raffle-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { REQUIRED_FIELDS } from '@/hooks/useWizardValidation';
import { useState, useEffect } from 'react';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { supabase } from '@/integrations/supabase/client';
import { validateSlugFormat, normalizeToSlug } from '@/lib/url-utils';
import { AlertCircle, CheckCircle2, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <Card>
      <CardHeader>
        <CardTitle>Información Básica</CardTitle>
        <CardDescription>Define el título y descripción de tu sorteo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                Título del Sorteo
                <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ej: Gran Sorteo de Navidad" 
                  {...field}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={() => handleBlur('title')}
                  className={cn(
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

        {/* Slug field - separate from title */}
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
                <div className="flex items-stretch">
                  <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md whitespace-nowrap">
                    sortavo.com/{orgSlug}/
                  </span>
                  <Input 
                    {...field}
                    value={field.value || ''}
                    placeholder="mi-sorteo"
                    onChange={(e) => handleSlugChange(e.target.value)}
                    onBlur={() => handleBlur('slug')}
                    disabled={!canEditSlug}
                    maxLength={100}
                    className={cn(
                      "rounded-l-none",
                      (slugFormatError || isDuplicateSlug) && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
              </FormControl>
              <FormDescription className="flex flex-col gap-1">
                {!canEditSlug ? (
                  <span className="flex items-center gap-1 text-muted-foreground text-sm">
                    <AlertCircle className="h-3 w-3" />
                    La URL no se puede cambiar después de publicar
                  </span>
                ) : (
                  <>
                    <span className="text-muted-foreground">
                      Solo letras minúsculas, números y guiones (3-100 caracteres)
                    </span>
                    {renderSlugStatus()}
                  </>
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe tu sorteo, las reglas y lo que los participantes pueden ganar..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
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
                  <SelectTrigger>
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
      </CardContent>
    </Card>
  );
};
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Save, Rocket, AlertCircle, CreditCard, Eye, EyeOff, X } from 'lucide-react';
import { useRaffles } from '@/hooks/useRaffles';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useWizardValidation } from '@/hooks/useWizardValidation';
import { WizardProgress } from '@/components/raffle/wizard/WizardProgress';
import { Step1BasicInfo } from '@/components/raffle/wizard/Step1BasicInfo';
import { Step2Prize } from '@/components/raffle/wizard/Step2Prize';
import { Step3Tickets } from '@/components/raffle/wizard/Step3Tickets';
import { Step4Draw } from '@/components/raffle/wizard/Step4Draw';
import { Step5Design } from '@/components/raffle/wizard/Step5Design';
import { RafflePreview } from '@/components/raffle/wizard/RafflePreview';
import { UpgradePlanModal } from '@/components/raffle/UpgradePlanModal';
import { checkRaffleLimit, checkTicketLimit, getSubscriptionLimits, SubscriptionTier } from '@/lib/subscription-limits';
import { parsePrizes, serializePrizes } from '@/types/prize';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

const STEPS = [
  { id: 1, title: 'Información Básica', description: 'Título y descripción' },
  { id: 2, title: 'Premio', description: 'Detalles del premio' },
  { id: 3, title: 'Boletos', description: 'Configuración de venta' },
  { id: 4, title: 'Sorteo', description: 'Fecha y método' },
  { id: 5, title: 'Diseño', description: 'Personalización' },
];

// Default customization values for optional features
const DEFAULT_FEATURE_CUSTOMIZATION = {
  show_random_picker: true,
  show_winners_history: true,
  show_probability_stats: true,
  show_viewers_count: true,
  show_purchase_toasts: true,
  show_urgency_badge: true,
  show_sticky_banner: true,
  show_social_proof: true,
};

export default function RaffleWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const { organization } = useAuth();
  const { toast } = useToast();
  const { useRaffleById, createRaffle, updateRaffle, publishRaffle } = useRaffles();
  const { methods: paymentMethods, isLoading: isLoadingPaymentMethods } = usePaymentMethods();
  
  const { data: existingRaffle, isLoading: isLoadingRaffle } = useRaffleById(id);
  
  // Query para cargar paquetes existentes
  const { data: existingPackages } = useQuery({
    queryKey: ['raffle-packages', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('raffle_packages')
        .select('*')
        .eq('raffle_id', id)
        .order('display_order');
      if (error) throw error;
      return data.map(pkg => ({
        quantity: pkg.quantity,
        price: Number(pkg.price),
        discount_percent: Number(pkg.discount_percent) || 0,
        label: pkg.label || '',
        display_order: pkg.display_order || 0,
      }));
    },
    enabled: !!id,
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const [showPaymentMethodsWarning, setShowPaymentMethodsWarning] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Check if there are enabled payment methods
  const enabledPaymentMethods = paymentMethods?.filter(m => m.enabled) || [];
  const hasEnabledPaymentMethods = enabledPaymentMethods.length > 0;

  // Get subscription limits
  const subscriptionLimits = getSubscriptionLimits(organization?.subscription_tier as SubscriptionTier);

  const form = useForm({
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      category: 'other',
      prize_name: '',
      prize_value: 0,
      prize_images: [] as string[],
      prize_video_url: '',
      prize_terms: '',
      prizes: [] as Array<{ id: string; name: string; value?: number | null; currency?: string | null }>,
      total_tickets: 100,
      ticket_price: 100,
      currency_code: organization?.currency_code || 'MXN',
      ticket_number_format: 'sequential' as 'sequential' | 'prefixed' | 'random',
      reservation_time_minutes: 15,
      max_tickets_per_purchase: 0,
      max_tickets_per_person: 0,
      lucky_numbers_enabled: false,
      lucky_numbers_config: null as unknown,
      draw_method: 'manual' as 'lottery_nacional' | 'manual' | 'random_org',
      draw_date: null as string | null,
      start_date: null as string | null,
      close_sale_hours_before: 0,
      lottery_draw_number: '',
      lottery_digits: 3,
      livestream_url: '',
      auto_publish_result: false,
      template_id: 'modern',
      customization: {
        ...DEFAULT_FEATURE_CUSTOMIZATION,
        primary_color: organization?.brand_color || '#2563EB',
        secondary_color: '#F97316',
        title_font: 'Inter',
        body_font: 'Inter',
        logo_position: 'top-left',
        sections: {
          hero: true,
          countdown: true,
          ticket_grid: true,
          packages: true,
          gallery: true,
          video: false,
          how_it_works: true,
          testimonials: false,
          faq: true,
          live_feed: false,
          stats: true,
          share_buttons: true,
        },
        faq_config: {
          show_default_faqs: true,
          custom_faqs: [],
        },
        headline: '',
        subheadline: '',
        cta_text: 'Comprar Boletos',
      } as unknown,
      packages: [] as Array<{
        quantity: number;
        price: number;
        discount_percent: number;
        label: string;
        display_order: number;
      }>,
    },
  });

  // Wizard validation hook
  const { 
    stepValidations, 
    canPublish, 
    validateStep 
  } = useWizardValidation(form, currentStep);

  // Prepare step statuses and errors for WizardProgress
  const stepStatuses = stepValidations.map(sv => sv.step === currentStep ? 'current' as const : sv.isValid ? 'complete' as const : 'incomplete' as const);
  const stepErrors = stepValidations.map(sv => sv.errors);

  // Load existing raffle data - filter out calculated fields that don't exist in the database
  useEffect(() => {
    if (existingRaffle) {
      // Exclude calculated fields and joined relations from useRaffleById that don't exist in the raffles table
      const { 
        tickets_sold, 
        tickets_available, 
        tickets_reserved, 
        total_revenue,
        organization,
        ...raffleData 
      } = existingRaffle;
      
      // Merge existing customization with default feature flags
      const existingCustomization = (raffleData.customization || {}) as Record<string, unknown>;
      const mergedCustomization = {
        ...DEFAULT_FEATURE_CUSTOMIZATION,
        ...existingCustomization,
      };
      
      // Parse prizes from JSONB or fallback to legacy fields
      const parsedPrizes = parsePrizes(
        raffleData.prizes,
        raffleData.prize_name,
        raffleData.prize_value
      );
      
      form.reset({
        ...raffleData,
        customization: mergedCustomization,
        prizes: parsedPrizes,
        packages: existingPackages || [],
      } as any);
    }
  }, [existingRaffle, existingPackages, form]);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Helper to ensure customization is always a complete object with explicit boolean values
  const buildCustomizationForSave = (customization: unknown): Record<string, unknown> => {
    const defaults = {
      ...DEFAULT_FEATURE_CUSTOMIZATION,
      primary_color: organization?.brand_color || '#2563EB',
      secondary_color: '#F97316',
      title_font: 'Inter',
      body_font: 'Inter',
      logo_position: 'top-left',
      sections: {
        hero: true,
        countdown: true,
        ticket_grid: true,
        packages: true,
        gallery: true,
        video: false,
        how_it_works: true,
        testimonials: false,
        faq: true,
        live_feed: false,
        stats: true,
        share_buttons: true,
      },
      faq_config: {
        show_default_faqs: true,
        custom_faqs: [],
      },
      headline: '',
      subheadline: '',
      cta_text: 'Comprar Boletos',
    };

    const current = (customization || {}) as Record<string, unknown>;
    
    // Merge with defaults, ensuring all feature flags are explicit booleans
    return {
      ...defaults,
      ...current,
      // Force explicit boolean values for all feature flags
      show_random_picker: current.show_random_picker === true,
      show_winners_history: current.show_winners_history === true,
      show_probability_stats: current.show_probability_stats === true,
      show_viewers_count: current.show_viewers_count === true,
      show_purchase_toasts: current.show_purchase_toasts === true,
      show_urgency_badge: current.show_urgency_badge === true,
      show_sticky_banner: current.show_sticky_banner === true,
      show_social_proof: current.show_social_proof === true,
    };
  };

  const handleSaveDraft = async () => {
    try {
      const values = form.getValues();
      const { packages, prizes, ...data } = values;
      
      // Serialize prizes and sync with legacy fields
      const serializedPrizes = serializePrizes(prizes || []);
      const firstPrize = serializedPrizes[0];
      
      // Ensure customization is properly built with explicit values
      const cleanedData = {
        ...data,
        customization: buildCustomizationForSave(data.customization),
        prizes: serializedPrizes,
        // Sync legacy fields with first prize
        prize_name: firstPrize?.name || data.prize_name || '',
        prize_value: firstPrize?.value ?? data.prize_value ?? 0,
      };
      
      let raffleId = id;
      
      if (isEditing && id) {
        await updateRaffle.mutateAsync({ id, data: cleanedData as unknown as TablesUpdate<'raffles'> });
      } else {
        const result = await createRaffle.mutateAsync(cleanedData as unknown as TablesInsert<'raffles'>);
        raffleId = result.id;
      }
      
      // Guardar paquetes de boletos
      if (raffleId && packages && packages.length > 0) {
        // Eliminar paquetes existentes
        await supabase.from('raffle_packages').delete().eq('raffle_id', raffleId);
        
        // Insertar nuevos paquetes
        const packagesToInsert = packages
          .filter((pkg: any) => pkg.quantity > 0 && pkg.price > 0)
          .map((pkg: any, idx: number) => ({
            raffle_id: raffleId,
            quantity: pkg.quantity,
            price: pkg.price,
            discount_percent: pkg.discount_percent || 0,
            label: pkg.label || null,
            display_order: idx,
          }));
        
        if (packagesToInsert.length > 0) {
          await supabase.from('raffle_packages').insert(packagesToInsert);
        }
      }
      
      if (isEditing && id) {
        toast({ title: 'Cambios guardados', description: 'La configuración se actualizó correctamente' });
      } else {
        toast({ title: 'Borrador guardado' });
        navigate(`/dashboard/raffles/${raffleId}/edit`);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({ title: 'Error al guardar', description: 'No se pudieron guardar los cambios', variant: 'destructive' });
    }
  };

  const handlePublish = async () => {
    // Check payment methods first
    if (!hasEnabledPaymentMethods) {
      setShowPaymentMethodsWarning(true);
      toast({ 
        title: 'Métodos de pago requeridos', 
        description: 'Configura al menos un método de pago antes de publicar',
        variant: 'destructive' 
      });
      return;
    }

    const values = form.getValues();
    
    // Check raffle limit
    if (organization?.id && !isEditing) {
      try {
        const raffleCheck = await checkRaffleLimit(
          organization.id,
          organization.subscription_tier as SubscriptionTier
        );

        if (!raffleCheck.allowed) {
          setUpgradeReason(
            `Has alcanzado el límite de ${raffleCheck.limit} sorteos activos. ` +
            `Actualmente tienes ${raffleCheck.current} sorteos.`
          );
          setShowUpgradeModal(true);
          return;
        }
      } catch (error) {
        console.error('Error checking raffle limit:', error);
      }
    }

    // Check ticket limit
    const ticketCheck = checkTicketLimit(
      values.total_tickets || 0,
      organization?.subscription_tier as SubscriptionTier
    );

    if (!ticketCheck.allowed) {
      setUpgradeReason(
        `Tu plan permite hasta ${ticketCheck.limit.toLocaleString()} boletos por sorteo. ` +
        `Intentas crear ${(values.total_tickets || 0).toLocaleString()} boletos.`
      );
      setShowUpgradeModal(true);
      return;
    }

    // Validate required fields - check prizes array instead of just prize_name
    const prizes = values.prizes || [];
    const firstPrizeName = prizes[0]?.name?.trim();
    if (!values.title || !firstPrizeName || !values.ticket_price) {
      toast({ 
        title: 'Campos requeridos', 
        description: 'Completa los campos obligatorios antes de publicar',
        variant: 'destructive' 
      });
      return;
    }

    // Validate dates
    if (values.start_date && values.draw_date) {
      if (new Date(values.start_date) >= new Date(values.draw_date)) {
        toast({ 
          title: 'Error en fechas', 
          description: 'La fecha de inicio debe ser anterior a la fecha del sorteo',
          variant: 'destructive' 
        });
        return;
      }
    }

    if (values.draw_date && new Date(values.draw_date) <= new Date()) {
      toast({ 
        title: 'Error en fecha', 
        description: 'La fecha del sorteo debe ser en el futuro',
        variant: 'destructive' 
      });
      return;
    }

    try {
      let raffleId = id;
      const { packages, prizes: formPrizes, ...data } = values;
      
      // Serialize prizes and sync with legacy fields
      const serializedPrizes = serializePrizes(formPrizes || []);
      const firstPrize = serializedPrizes[0];
      
      // Ensure customization is properly built with explicit values
      const cleanedData = {
        ...data,
        customization: buildCustomizationForSave(data.customization),
        prizes: serializedPrizes,
        // Sync legacy fields with first prize
        prize_name: firstPrize?.name || data.prize_name || '',
        prize_value: firstPrize?.value ?? data.prize_value ?? 0,
      };
      
      if (!isEditing) {
        const result = await createRaffle.mutateAsync(cleanedData as unknown as TablesInsert<'raffles'>);
        raffleId = result.id;
      } else {
        await updateRaffle.mutateAsync({ id: id!, data: cleanedData as unknown as TablesUpdate<'raffles'> });
      }

      // Guardar paquetes de boletos antes de publicar
      if (raffleId && packages && packages.length > 0) {
        // Eliminar paquetes existentes
        await supabase.from('raffle_packages').delete().eq('raffle_id', raffleId);
        
        // Insertar nuevos paquetes
        const packagesToInsert = packages
          .filter((pkg: any) => pkg.quantity > 0 && pkg.price > 0)
          .map((pkg: any, idx: number) => ({
            raffle_id: raffleId,
            quantity: pkg.quantity,
            price: pkg.price,
            discount_percent: pkg.discount_percent || 0,
            label: pkg.label || null,
            display_order: idx,
          }));
        
        if (packagesToInsert.length > 0) {
          await supabase.from('raffle_packages').insert(packagesToInsert);
        }
      }

      await publishRaffle.mutateAsync(raffleId!);
      navigate(`/dashboard/raffles/${raffleId}`);
    } catch (error) {
      console.error('Error publishing:', error);
      toast({ title: 'Error al publicar', description: 'No se pudo publicar el sorteo', variant: 'destructive' });
    }
  };

  const handleNavigateToStep = (step: number) => {
    setCurrentStep(step);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo form={form} />;
      case 2:
        return <Step2Prize form={form} />;
      case 3:
        return <Step3Tickets form={form} />;
      case 4:
        return <Step4Draw form={form} />;
      case 5:
        return (
          <Step5Design 
            form={form}
            organization={organization}
            stepValidations={stepValidations}
            canPublish={canPublish}
            hasPaymentMethods={hasEnabledPaymentMethods}
            onNavigateToStep={handleNavigateToStep}
          />
        );
      default:
        return null;
    }
  };

  if (isEditing && isLoadingRaffle) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-5 md:space-y-8">
        {/* Premium Header */}
        <div className="relative">
          {/* Gradient accent line */}
          <div className="absolute -top-4 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent rounded-full" />
          
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
                  <Rocket className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {isEditing ? 'Editar Sorteo' : 'Crear Sorteo'}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Paso {currentStep} de {STEPS.length} • {STEPS[currentStep - 1].description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowPreview(!showPreview)}
                  className="hidden lg:flex border-border/50 hover:bg-muted/50"
                >
                  {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="px-2.5 hover:bg-muted/50" 
                  onClick={() => navigate('/dashboard/raffles')}
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Cancelar</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Progress */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl" />
          <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-3 md:p-4 shadow-sm">
            <WizardProgress 
              steps={STEPS} 
              currentStep={currentStep} 
              stepStatuses={stepStatuses}
              stepErrors={stepErrors}
            />
          </div>
        </div>

        {/* Payment Methods Warning */}
        {showPaymentMethodsWarning && !hasEnabledPaymentMethods && (
          <Alert variant="destructive" className="py-3 border-destructive/30 bg-destructive/5">
            <CreditCard className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">Métodos de pago requeridos</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
              <span>Configura un método de pago para que tus clientes puedan pagarte.</span>
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto border-destructive/30 hover:bg-destructive/10">
                <Link to="/dashboard/settings?tab=payment-methods">
                  Configurar Pagos
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content with Preview */}
        <div className={`grid gap-5 md:gap-8 ${showPreview ? 'lg:grid-cols-[1fr,420px]' : ''}`}>
          {/* Left: Form */}
          <div className="space-y-4 md:space-y-5">
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()}>
                {/* Premium Card */}
                <div className="relative group">
                  {/* Glow effect on hover (desktop only) */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden md:block" />
                  
                  <Card className="relative overflow-hidden border-border/50 shadow-lg shadow-black/5 bg-card/95 backdrop-blur-sm rounded-xl md:rounded-2xl">
                    {/* Card header accent */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                    
                    <CardContent className="p-4 sm:p-5 md:p-8">
                      {renderStep()}
                    </CardContent>
                  </Card>
                </div>
              </form>
            </Form>

            {/* Premium Navigation Bar */}
            <div className="relative">
              {/* Gradient background for mobile sticky bar */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background to-transparent sm:hidden -mx-4 px-4 -mb-4 pb-4" />
              
              <div className="relative flex items-center justify-between gap-3 p-4 -mx-4 sm:mx-0 sm:p-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl sm:rounded-2xl shadow-lg shadow-black/5 sticky bottom-3 sm:static z-10">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="px-4 border-border/50 hover:bg-muted/50 transition-all"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>

                <div className="flex items-center gap-2.5">
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={handleSaveDraft}
                    disabled={createRaffle.isPending || updateRaffle.isPending}
                    className="px-4 hover:bg-muted/50"
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">Guardar borrador</span>
                    <span className="sm:hidden">Guardar</span>
                  </Button>

                  {currentStep < 5 ? (
                    <Button 
                      onClick={handleNext} 
                      size="default" 
                      className="px-5 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                    >
                      <span>Siguiente</span>
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handlePublish}
                      size="default"
                      disabled={publishRaffle.isPending || !canPublish || !hasEnabledPaymentMethods}
                      className="px-5 bg-gradient-to-r from-primary to-success hover:from-primary/90 hover:to-success/90 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                    >
                      <Rocket className="h-4 w-4 mr-1.5" />
                      <span>Publicar Sorteo</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          {showPreview && (
            <div className="hidden lg:block sticky top-6 h-fit">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 rounded-2xl blur-sm" />
                <div className="relative">
                  <RafflePreview form={form} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <UpgradePlanModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        currentTier={organization?.subscription_tier || 'basic'}
        currentLimit={subscriptionLimits.maxTicketsPerRaffle}
        requestedValue={form.watch('total_tickets') || 0}
        feature="boletos por sorteo"
        reason={upgradeReason}
      />
    </DashboardLayout>
  );
}
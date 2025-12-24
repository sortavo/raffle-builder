import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Save, Rocket, AlertCircle } from 'lucide-react';
import { useRaffles } from '@/hooks/useRaffles';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { WizardProgress } from '@/components/raffle/wizard/WizardProgress';
import { Step1BasicInfo } from '@/components/raffle/wizard/Step1BasicInfo';
import { Step2Prize } from '@/components/raffle/wizard/Step2Prize';
import { Step3Tickets } from '@/components/raffle/wizard/Step3Tickets';
import { Step4Draw } from '@/components/raffle/wizard/Step4Draw';
import { Step5Design } from '@/components/raffle/wizard/Step5Design';
import { UpgradePlanModal } from '@/components/raffle/UpgradePlanModal';
import { checkRaffleLimit, checkTicketLimit, getSubscriptionLimits, SubscriptionTier } from '@/lib/subscription-limits';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

const STEPS = [
  { id: 1, title: 'Información Básica', description: 'Título y descripción' },
  { id: 2, title: 'Premio', description: 'Detalles del premio' },
  { id: 3, title: 'Boletos', description: 'Configuración de venta' },
  { id: 4, title: 'Sorteo', description: 'Fecha y método' },
  { id: 5, title: 'Diseño', description: 'Personalización' },
];

export default function RaffleWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const { organization } = useAuth();
  const { toast } = useToast();
  const { useRaffleById, createRaffle, updateRaffle, publishRaffle } = useRaffles();
  
  const { data: existingRaffle, isLoading: isLoadingRaffle } = useRaffleById(id);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

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
      total_tickets: 100,
      ticket_price: 100,
      currency_code: organization?.currency_code || 'MXN',
      ticket_number_format: 'sequential' as 'sequential' | 'prefixed' | 'random',
      allow_individual_sale: true,
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

  // Load existing raffle data
  useEffect(() => {
    if (existingRaffle) {
      form.reset({
        ...existingRaffle,
        packages: [],
      });
    }
  }, [existingRaffle, form]);

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

  const handleSaveDraft = async () => {
    try {
      const values = form.getValues();
      const { packages, ...data } = values;
      
      if (isEditing && id) {
        await updateRaffle.mutateAsync({ id, data: data as unknown as TablesUpdate<'raffles'> });
        toast({ title: 'Cambios guardados' });
      } else {
        const result = await createRaffle.mutateAsync(data as unknown as TablesInsert<'raffles'>);
        toast({ title: 'Borrador guardado' });
        navigate(`/dashboard/raffles/${result.id}/edit`);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const handlePublish = async () => {
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

    // Validate required fields
    if (!values.title || !values.prize_name || !values.ticket_price) {
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
      const { packages, ...data } = values;
      
      if (!isEditing) {
        const result = await createRaffle.mutateAsync(data as unknown as TablesInsert<'raffles'>);
        raffleId = result.id;
      } else {
        await updateRaffle.mutateAsync({ id: id!, data: data as unknown as TablesUpdate<'raffles'> });
      }

      await publishRaffle.mutateAsync(raffleId!);
      navigate(`/dashboard/raffles/${raffleId}`);
    } catch (error) {
      console.error('Error publishing:', error);
    }
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
        return <Step5Design form={form} />;
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Editar Sorteo' : 'Crear Nuevo Sorteo'}
            </h1>
            <p className="text-muted-foreground">
              {STEPS[currentStep - 1].description}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard/raffles')}>
            Cancelar
          </Button>
        </div>

        {/* Progress */}
        <WizardProgress steps={STEPS} currentStep={currentStep} />

        {/* Step Content */}
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <Card>
              <CardContent className="pt-6">
                {renderStep()}
              </CardContent>
            </Card>
          </form>
        </Form>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={createRaffle.isPending || updateRaffle.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar Borrador
            </Button>

            {currentStep < 5 ? (
              <Button onClick={handleNext}>
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handlePublish}
                disabled={publishRaffle.isPending}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Publicar Sorteo
              </Button>
            )}
          </div>
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
import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Check,
  Package,
  Truck,
  CreditCard,
  Clock,
  MapPin,
  Gift,
  Phone,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQEditorProps {
  form: UseFormReturn<any>;
}

// Quick FAQ suggestions that organizers commonly need
const FAQ_SUGGESTIONS = [
  {
    id: 'shipping',
    label: 'Envío',
    icon: Truck,
    question: '¿Hacen envíos?',
    answer: 'Sí, hacemos envíos a todo el país. El costo y tiempo de envío dependerá de tu ubicación.'
  },
  {
    id: 'delivery-time',
    label: 'Tiempo',
    icon: Clock,
    question: '¿Cuánto tarda el envío?',
    answer: 'El envío tarda de 3 a 7 días hábiles dependiendo de tu ubicación.'
  },
  {
    id: 'pickup',
    label: 'Recoger',
    icon: MapPin,
    question: '¿Puedo recoger el premio en persona?',
    answer: 'Sí, puedes recoger el premio en nuestra ubicación previa coordinación.'
  },
  {
    id: 'refund',
    label: 'Reembolso',
    icon: RefreshCw,
    question: '¿Hay reembolsos?',
    answer: 'Los boletos no son reembolsables una vez comprados, según nuestros términos y condiciones.'
  },
  {
    id: 'payment-deadline',
    label: 'Plazo pago',
    icon: CreditCard,
    question: '¿Cuánto tiempo tengo para pagar?',
    answer: 'Tienes el tiempo indicado en tu reserva para completar el pago. Si no pagas a tiempo, los boletos quedarán disponibles nuevamente.'
  },
  {
    id: 'prize-exchange',
    label: 'Cambio',
    icon: Gift,
    question: '¿Puedo cambiar el premio por dinero?',
    answer: 'No, el premio no es canjeable por dinero en efectivo.'
  },
  {
    id: 'contact',
    label: 'Contacto',
    icon: Phone,
    question: '¿Cómo los contacto para dudas?',
    answer: 'Puedes contactarnos por WhatsApp o por las redes sociales indicadas en esta página.'
  },
  {
    id: 'packages',
    label: 'Paquetes',
    icon: Package,
    question: '¿Hay promociones por varios boletos?',
    answer: 'Sí, ofrecemos paquetes con descuento. Consulta las opciones disponibles al momento de comprar.'
  }
];

export const FAQEditor = ({ form }: FAQEditorProps) => {
  const customization = form.watch('customization') || {};
  const sections = customization.sections || {};
  const faqConfig = customization.faq_config || { show_default_faqs: true, custom_faqs: [] };
  
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  const showFaqSection = sections.faq !== false;
  const showDefaultFaqs = faqConfig.show_default_faqs !== false;
  const customFaqs: FAQItem[] = faqConfig.custom_faqs || [];

  const updateCustomization = (key: string, value: unknown) => {
    const current = form.getValues('customization') || {};
    form.setValue('customization', { ...current, [key]: value });
  };

  const updateSections = (key: string, value: boolean) => {
    const currentSections = customization.sections || {};
    updateCustomization('sections', { ...currentSections, [key]: value });
  };

  const updateFaqConfig = (updates: Partial<typeof faqConfig>) => {
    updateCustomization('faq_config', { ...faqConfig, ...updates });
  };

  const handleAddFaq = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    
    const newFaq: FAQItem = { question: newQuestion.trim(), answer: newAnswer.trim() };
    updateFaqConfig({ custom_faqs: [...customFaqs, newFaq] });
    setNewQuestion('');
    setNewAnswer('');
    setIsAdding(false);
  };

  const handleAddSuggestion = (suggestion: typeof FAQ_SUGGESTIONS[0]) => {
    // Check if already exists
    const exists = customFaqs.some(
      faq => faq.question.toLowerCase() === suggestion.question.toLowerCase()
    );
    if (exists) return;
    
    const newFaq: FAQItem = { question: suggestion.question, answer: suggestion.answer };
    updateFaqConfig({ custom_faqs: [...customFaqs, newFaq] });
  };

  const handleEditFaq = (index: number) => {
    setEditingIndex(index);
    setEditQuestion(customFaqs[index].question);
    setEditAnswer(customFaqs[index].answer);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editQuestion.trim() || !editAnswer.trim()) return;
    
    const updatedFaqs = [...customFaqs];
    updatedFaqs[editingIndex] = { question: editQuestion.trim(), answer: editAnswer.trim() };
    updateFaqConfig({ custom_faqs: updatedFaqs });
    setEditingIndex(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  const handleDeleteFaq = (index: number) => {
    const updatedFaqs = customFaqs.filter((_, i) => i !== index);
    updateFaqConfig({ custom_faqs: updatedFaqs });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewQuestion('');
    setNewAnswer('');
  };

  // Check which suggestions are already added
  const getAddedSuggestionIds = () => {
    return FAQ_SUGGESTIONS.filter(suggestion =>
      customFaqs.some(faq => 
        faq.question.toLowerCase() === suggestion.question.toLowerCase()
      )
    ).map(s => s.id);
  };

  const addedSuggestionIds = getAddedSuggestionIds();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Preguntas Frecuentes
        </CardTitle>
        <CardDescription>
          Personaliza las preguntas que verán los compradores (opcional)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main toggle */}
        <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              showFaqSection ? "bg-primary/10" : "bg-muted"
            )}>
              <HelpCircle className={cn(
                "w-5 h-5",
                showFaqSection ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <Label className="font-medium">Mostrar sección de FAQ</Label>
              <p className="text-sm text-muted-foreground">
                Activa para mostrar preguntas frecuentes en tu página
              </p>
            </div>
          </div>
          <Switch
            checked={showFaqSection}
            onCheckedChange={(checked) => updateSections('faq', checked)}
          />
        </div>

        {/* Content when FAQ section is enabled */}
        {showFaqSection && (
          <>
            <Separator />
            
            {/* Include default FAQs */}
            <div className="flex items-center space-x-3 p-4 bg-card rounded-lg border border-border">
              <Checkbox
                id="show_default_faqs"
                checked={showDefaultFaqs}
                onCheckedChange={(checked) => updateFaqConfig({ show_default_faqs: !!checked })}
              />
              <div>
                <label htmlFor="show_default_faqs" className="text-sm font-medium cursor-pointer">
                  Incluir preguntas automáticas
                </label>
                <p className="text-xs text-muted-foreground">
                  Se generan automáticamente basadas en la información de tu sorteo (precio, fecha, métodos de pago, etc.)
                </p>
              </div>
            </div>

            {/* Quick add suggestions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Agregar pregunta rápida</Label>
              <div className="flex flex-wrap gap-2">
                {FAQ_SUGGESTIONS.map((suggestion) => {
                  const isAdded = addedSuggestionIds.includes(suggestion.id);
                  const Icon = suggestion.icon;
                  return (
                    <Button
                      key={suggestion.id}
                      type="button"
                      variant={isAdded ? "secondary" : "outline"}
                      size="sm"
                      className={cn(
                        "gap-1.5 text-xs",
                        isAdded && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => !isAdded && handleAddSuggestion(suggestion)}
                      disabled={isAdded}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {suggestion.label}
                      {isAdded && <Check className="w-3 h-3 ml-1" />}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Click para agregar, luego edita la respuesta según tu caso
              </p>
            </div>

            <Separator />

            {/* Custom FAQs section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Tus preguntas personalizadas</Label>
                <Badge variant="secondary" className="text-xs">
                  {customFaqs.length} {customFaqs.length === 1 ? 'pregunta' : 'preguntas'}
                </Badge>
              </div>

              {/* Existing custom FAQs */}
              {customFaqs.length > 0 && (
                <div className="space-y-3">
                  {customFaqs.map((faq, index) => (
                    <div 
                      key={index} 
                      className="bg-card rounded-lg border border-border overflow-hidden"
                    >
                      {editingIndex === index ? (
                        // Edit mode
                        <div className="p-4 space-y-3">
                          <Input
                            placeholder="Pregunta"
                            value={editQuestion}
                            onChange={(e) => setEditQuestion(e.target.value)}
                            className="font-medium"
                          />
                          <Textarea
                            placeholder="Respuesta"
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={!editQuestion.trim() || !editAnswer.trim()}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Guardar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                P: {faq.question}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                R: {faq.answer}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditFaq(index)}
                              >
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteFaq(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new FAQ form */}
              {isAdding ? (
                <div className="bg-card rounded-lg border border-primary/20 p-4 space-y-3">
                  <Input
                    placeholder="Escribe la pregunta..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="font-medium"
                  />
                  <Textarea
                    placeholder="Escribe la respuesta..."
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelAdd}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddFaq}
                      disabled={!newQuestion.trim() || !newAnswer.trim()}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setIsAdding(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Escribir pregunta personalizada
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

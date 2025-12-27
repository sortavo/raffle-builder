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
import { HelpCircle, Plus, Pencil, Trash2, GripVertical, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQEditorProps {
  form: UseFormReturn<any>;
}

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
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
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
            <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200">
              <Checkbox
                id="show_default_faqs"
                checked={showDefaultFaqs}
                onCheckedChange={(checked) => updateFaqConfig({ show_default_faqs: !!checked })}
              />
              <div>
                <label htmlFor="show_default_faqs" className="text-sm font-medium cursor-pointer">
                  Incluir preguntas predefinidas
                </label>
                <p className="text-xs text-muted-foreground">
                  ¿Cómo participo?, ¿Cómo sé si gané?, ¿Cuándo es el sorteo?, ¿Métodos de pago?
                </p>
              </div>
            </div>

            {/* Custom FAQs section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Preguntas personalizadas</Label>
                <span className="text-xs text-muted-foreground">{customFaqs.length} preguntas</span>
              </div>

              {/* Existing custom FAQs */}
              {customFaqs.length > 0 && (
                <div className="space-y-3">
                  {customFaqs.map((faq, index) => (
                    <div 
                      key={index} 
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
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
                              <p className="font-medium text-gray-900 truncate">
                                P: {faq.question}
                              </p>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
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
                                <Pencil className="w-4 h-4 text-gray-500" />
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
                  Agregar Pregunta
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

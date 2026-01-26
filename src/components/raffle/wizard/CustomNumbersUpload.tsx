import { useState, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileSpreadsheet, Upload, X, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CustomNumbersUploadProps {
  form: UseFormReturn<any>;
  raffleId?: string;
  totalTickets: number;
}

interface UploadValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  numbers: string[];
  duplicates: string[];
}

function validateCSV(content: string, expectedCount: number): UploadValidation {
  const result: UploadValidation = {
    valid: true,
    errors: [],
    warnings: [],
    numbers: [],
    duplicates: [],
  };
  
  // Parse CSV (handle both comma and newline separated)
  const lines = content.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  
  // Remove header if present
  if (lines[0]?.toLowerCase().includes('numero') || lines[0]?.toLowerCase().includes('number')) {
    lines.shift();
  }
  
  const seen = new Set<string>();
  
  for (const line of lines) {
    const number = line.trim();
    if (!number) continue;
    
    // Check for duplicates
    if (seen.has(number)) {
      result.duplicates.push(number);
      result.valid = false;
    } else {
      seen.add(number);
      result.numbers.push(number);
    }
  }
  
  // Validate count
  if (result.numbers.length !== expectedCount) {
    result.errors.push(
      `La lista tiene ${result.numbers.length} números pero se esperaban ${expectedCount}`
    );
    result.valid = false;
  }
  
  if (result.duplicates.length > 0) {
    result.errors.push(
      `Se encontraron ${result.duplicates.length} números duplicados: ${result.duplicates.slice(0, 5).join(', ')}${result.duplicates.length > 5 ? '...' : ''}`
    );
  }
  
  return result;
}

export function CustomNumbersUpload({ form, raffleId, totalTickets }: CustomNumbersUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validation, setValidation] = useState<UploadValidation | null>(null);
  const [uploadedNumbers, setUploadedNumbers] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Por favor sube un archivo CSV o TXT');
      return;
    }
    
    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const validationResult = validateCSV(content, totalTickets);
      setValidation(validationResult);
      
      if (validationResult.valid) {
        setUploadedNumbers(validationResult.numbers);
        // Update form with custom numbers config
        const currentConfig = form.getValues('numbering_config') || {};
        form.setValue('numbering_config', {
          ...currentConfig,
          mode: 'custom_list',
          custom_numbers: validationResult.numbers,
        });
        form.setValue('ticket_number_format', 'custom');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSaveCustomNumbers = async () => {
    if (!raffleId || uploadedNumbers.length === 0) {
      toast.error('No hay números para guardar o falta el ID del sorteo');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Delete existing custom numbers for this raffle
      await supabase
        .from('raffle_custom_numbers')
        .delete()
        .eq('raffle_id', raffleId);
      
      // Insert in batches of 1000
      const batchSize = 1000;
      const totalBatches = Math.ceil(uploadedNumbers.length / batchSize);
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = uploadedNumbers.slice(i * batchSize, (i + 1) * batchSize);
        const records = batch.map((num, idx) => ({
          raffle_id: raffleId,
          ticket_index: i * batchSize + idx + 1,
          custom_number: num,
        }));
        
        const { error } = await supabase
          .from('raffle_custom_numbers')
          .insert(records);
        
        if (error) throw error;
        
        setUploadProgress(Math.round(((i + 1) / totalBatches) * 100));
      }
      
      toast.success(`${uploadedNumbers.length} números personalizados guardados`);
    } catch (error) {
      console.error('Error saving custom numbers:', error);
      toast.error('Error al guardar los números personalizados');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleClearNumbers = () => {
    setUploadedNumbers([]);
    setValidation(null);
    
    // Reset numbering config to sequential
    const currentConfig = form.getValues('numbering_config') || {};
    form.setValue('numbering_config', {
      ...currentConfig,
      mode: 'sequential',
      custom_numbers: null,
    });
    form.setValue('ticket_number_format', 'sequential');
  };
  
  const downloadTemplate = () => {
    const content = `numero\n${Array.from({ length: Math.min(10, totalTickets) }, (_, i) => `TICKET-${String(i + 1).padStart(4, '0')}`).join('\n')}\n... (agrega ${totalTickets} números en total)`;
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-numeros-personalizados.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Lista de Números Personalizados
        </CardTitle>
        <CardDescription>
          Sube un archivo CSV con tus propios números de boletos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadedNumbers.length === 0 ? (
          <>
            {/* Upload Area */}
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Haz clic para subir archivo</p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV o TXT con {totalTickets.toLocaleString()} números únicos
              </p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* Download Template */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadTemplate}
              className="w-full"
              type="button"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar Plantilla CSV
            </Button>
          </>
        ) : (
          <>
            {/* Success State */}
            <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">
                Lista Válida
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                {uploadedNumbers.length.toLocaleString()} números únicos listos para usar
              </AlertDescription>
            </Alert>
            
            {/* Preview */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium mb-2">Vista Previa:</p>
              <div className="flex flex-wrap gap-2">
                {uploadedNumbers.slice(0, 8).map((num, i) => (
                  <Badge key={i} variant="outline" className="font-mono text-sm">
                    {num}
                  </Badge>
                ))}
                {uploadedNumbers.length > 8 && (
                  <Badge variant="secondary">
                    +{(uploadedNumbers.length - 8).toLocaleString()} más
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              {raffleId && (
                <Button
                  onClick={handleSaveCustomNumbers}
                  disabled={isUploading}
                  className="flex-1"
                  type="button"
                >
                  {isUploading ? 'Guardando...' : 'Guardar en Base de Datos'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleClearNumbers}
                disabled={isUploading}
                type="button"
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            </div>
            
            {isUploading && (
              <Progress value={uploadProgress} className="h-2" />
            )}
          </>
        )}
        
        {/* Validation Errors */}
        {validation && !validation.valid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errores de Validación</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {validation.errors.map((err, i) => (
                  <li key={i} className="text-sm">{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES } from '@/lib/currency-utils';
import { ImagePlus, Video, X, Loader2, GripVertical, Plus, Trash2, Gift, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressImage, formatBytes } from '@/lib/image-compression';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Prize, createEmptyPrize, parsePrizes, PRIZE_DISPLAY_MODES } from '@/types/prize';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { verticalListSortingStrategy } from '@dnd-kit/sortable';

interface SortableImageProps {
  id: string;
  url: string;
  index: number;
  onRemove: (index: number) => void;
}

const SortableImage = ({ id, url, index, onRemove }: SortableImageProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group aspect-square",
        isDragging && "z-50 opacity-80"
      )}
    >
      <img
        src={url}
        alt={`Premio ${index + 1}`}
        className={cn(
          "w-full h-full object-cover rounded-lg border",
          isDragging && "ring-2 ring-primary shadow-lg"
        )}
      />
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 h-6 w-6 flex items-center justify-center bg-background/80 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {/* Remove button */}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(index)}
      >
        <X className="h-3 w-3" />
      </Button>
      {/* Position indicator */}
      <div className="absolute bottom-1 left-1 h-5 w-5 flex items-center justify-center bg-background/80 rounded text-xs font-medium">
        {index + 1}
      </div>
    </div>
  );
};

interface SortablePrizeRowProps {
  prize: Prize;
  index: number;
  isFirst: boolean;
  firstPrizeHasName: boolean;
  defaultCurrency: string;
  onUpdate: (index: number, field: keyof Prize, value: string | number | null) => void;
  onRemove: (index: number) => void;
}

const SortablePrizeRow = ({ 
  prize, 
  index, 
  isFirst, 
  firstPrizeHasName, 
  defaultCurrency, 
  onUpdate, 
  onRemove 
}: SortablePrizeRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prize.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid gap-3 p-4 rounded-lg border bg-muted/30",
        isFirst && !firstPrizeHasName && "border-destructive/50",
        isDragging && "z-50 opacity-90 shadow-lg ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            Premio {index + 1} {isFirst && <span className="text-destructive">*</span>}
          </span>
        </div>
        {!isFirst && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Labels row - solo visible en desktop */}
      <div className="hidden md:grid md:grid-cols-[1fr,120px,100px] gap-3 mb-1">
        <span className="text-xs text-muted-foreground">
          Nombre del premio {isFirst && <span className="text-destructive">*</span>}
        </span>
        <span className="text-xs text-muted-foreground">
          Valor <span className="text-muted-foreground/70">(opcional)</span>
        </span>
        <span className="text-xs text-muted-foreground">
          Moneda
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-[1fr,120px,100px] gap-3">
        {/* Prize Name */}
        <div>
          <span className="md:hidden text-xs text-muted-foreground mb-1 block">
            Nombre del premio {isFirst && <span className="text-destructive">*</span>}
          </span>
          <Input
            placeholder="ej: iPhone 16 Pro Max"
            value={prize.name || ''}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            className={cn(
              isFirst && !firstPrizeHasName && "border-destructive focus-visible:ring-destructive"
            )}
          />
        </div>
        
        {/* Prize Value */}
        <div>
          <span className="md:hidden text-xs text-muted-foreground mb-1 block">
            Valor <span className="text-muted-foreground/70">(opcional)</span>
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              type="number"
              placeholder="0"
              className="pl-7"
              value={prize.value ?? ''}
              onChange={(e) => onUpdate(index, 'value', e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
        </div>
        
        {/* Currency */}
        <div>
          <span className="md:hidden text-xs text-muted-foreground mb-1 block">
            Moneda
          </span>
          <Select 
            value={prize.currency || defaultCurrency} 
            onValueChange={(value) => onUpdate(index, 'currency', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.flag} {curr.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

interface Step2Props {
  form: UseFormReturn<any>;
}

const MAX_IMAGES = 30;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const Step2Prize = ({ form }: Step2Props) => {
  const defaultCurrency = form.watch('currency_code') || 'MXN';
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isGeneratingTerms, setIsGeneratingTerms] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const prizeImages = form.watch('prize_images') || [];
  const prizes: Prize[] = form.watch('prizes') || [];

  // Initialize prizes from legacy fields if empty
  useEffect(() => {
    const currentPrizes = form.getValues('prizes');
    if (!currentPrizes || (Array.isArray(currentPrizes) && currentPrizes.length === 0)) {
      const prizeName = form.getValues('prize_name');
      const prizeValue = form.getValues('prize_value');
      const initialPrizes = parsePrizes([], prizeName, prizeValue);
      form.setValue('prizes', initialPrizes);
    }
  }, [form]);

  const updatePrize = (index: number, field: keyof Prize, value: string | number | null) => {
    const currentPrizes = [...(form.getValues('prizes') || [])];
    if (currentPrizes[index]) {
      currentPrizes[index] = { ...currentPrizes[index], [field]: value };
      form.setValue('prizes', currentPrizes);
      
      // Sync first prize with legacy fields
      if (index === 0) {
        if (field === 'name') {
          form.setValue('prize_name', value as string);
        } else if (field === 'value') {
          form.setValue('prize_value', value as number);
        }
      }
    }
  };

  const addPrize = () => {
    const currentPrizes = form.getValues('prizes') || [];
    form.setValue('prizes', [...currentPrizes, createEmptyPrize()]);
  };

  const removePrize = (index: number) => {
    if (index === 0) return; // Can't remove first prize
    const currentPrizes = [...(form.getValues('prizes') || [])];
    currentPrizes.splice(index, 1);
    form.setValue('prizes', currentPrizes);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} es muy grande. Máximo 5MB.`);
      return null;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    
    if (!fileExt || !allowedExts.includes(fileExt)) {
      toast.error(`${file.name} no es un formato válido. Use JPG, PNG, WebP o GIF.`);
      return null;
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `prizes/${fileName}`;

    const { error } = await supabase.storage
      .from('prize-images')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      toast.error(`Error al subir ${file.name}`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('prize-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentImages = [...(form.getValues('prize_images') || [])];
      const oldIndex = currentImages.indexOf(active.id as string);
      const newIndex = currentImages.indexOf(over.id as string);
      
      const newOrder = arrayMove(currentImages, oldIndex, newIndex);
      form.setValue('prize_images', newOrder);
    }
  };

  const handlePrizeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentPrizes = [...(form.getValues('prizes') || [])];
      const oldIndex = currentPrizes.findIndex(p => p.id === active.id);
      const newIndex = currentPrizes.findIndex(p => p.id === over.id);
      
      const newOrder = arrayMove(currentPrizes, oldIndex, newIndex);
      form.setValue('prizes', newOrder);
      
      // Sync first prize with legacy fields after reorder
      if (newOrder[0]) {
        form.setValue('prize_name', newOrder[0].name || '');
        form.setValue('prize_value', newOrder[0].value ?? null);
      }
    }
  };

  const handleFilesSelected = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const currentImages = form.getValues('prize_images') || [];
    
    if (currentImages.length + fileArray.length > MAX_IMAGES) {
      toast.error(`Máximo ${MAX_IMAGES} imágenes permitidas`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadedUrls: string[] = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    
    for (let i = 0; i < fileArray.length; i++) {
      // Show compression status
      toast.loading(`⏳ Optimizando imagen ${i + 1}/${fileArray.length}...`, { id: 'compress-progress' });
      
      // Compress the image before uploading
      const compressionResult = await compressImage(fileArray[i], {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.8,
      });
      
      totalOriginalSize += compressionResult.originalSize;
      totalCompressedSize += compressionResult.compressedSize;
      
      const url = await uploadImage(compressionResult.file);
      if (url) {
        uploadedUrls.push(url);
      }
      setUploadProgress(((i + 1) / fileArray.length) * 100);
    }

    toast.dismiss('compress-progress');

    if (uploadedUrls.length > 0) {
      form.setValue('prize_images', [...currentImages, ...uploadedUrls]);
      
      // Show success with compression stats
      const savedBytes = totalOriginalSize - totalCompressedSize;
      if (savedBytes > 0) {
        toast.success(
          `✅ ${uploadedUrls.length} imagen(es) subida(s) (${formatBytes(totalOriginalSize)} → ${formatBytes(totalCompressedSize)})`
        );
      } else {
        toast.success(`${uploadedUrls.length} imagen(es) subida(s)`);
      }
    }

    setIsUploading(false);
    setUploadProgress(0);
  }, [form]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  }, [handleFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleRemoveImage = (index: number) => {
    const currentImages = [...(form.getValues('prize_images') || [])];
    currentImages.splice(index, 1);
    form.setValue('prize_images', currentImages);
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const firstPrizeHasName = prizes[0]?.name?.trim().length > 0;

  const handleGenerateTerms = async () => {
    setIsGeneratingTerms(true);
    try {
      const title = form.getValues('title');
      const category = form.getValues('category');
      const firstPrize = prizes[0];
      
      const { data, error } = await supabase.functions.invoke('generate-description', {
        body: {
          type: 'prize_terms',
          title,
          category,
          prizeName: firstPrize?.name,
          prizeValue: firstPrize?.value,
          currencyCode: firstPrize?.currency || defaultCurrency,
        },
      });

      if (error) {
        console.error('Error generating terms:', error);
        toast.error('Error al generar términos');
        return;
      }

      if (data?.prize_terms) {
        form.setValue('prize_terms', data.prize_terms);
        toast.success('Términos generados con IA');
      }
    } catch (err) {
      console.error('Error generating terms:', err);
      toast.error('Error al generar términos');
    } finally {
      setIsGeneratingTerms(false);
    }
  };

  return (
    <Card className="border-0 shadow-none md:border md:shadow-sm">
      <CardHeader className="px-0 md:px-6 pt-0 md:pt-6">
        <CardTitle className="text-lg md:text-xl">Configuración de Premios</CardTitle>
        <CardDescription>Define los premios que van a ganar los participantes</CardDescription>
      </CardHeader>
      <CardContent className="px-0 md:px-6 space-y-5 md:space-y-6">
        {/* Prize Rows */}
        <div className="space-y-4">
          <FormLabel className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Premios del Sorteo
          </FormLabel>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handlePrizeDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={prizes.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {prizes.map((prize, index) => (
                  <SortablePrizeRow
                    key={prize.id}
                    prize={prize}
                    index={index}
                    isFirst={index === 0}
                    firstPrizeHasName={firstPrizeHasName}
                    defaultCurrency={defaultCurrency}
                    onUpdate={updatePrize}
                    onRemove={removePrize}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Prize Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addPrize}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar otro premio
          </Button>

          {!firstPrizeHasName && (
            <p className="text-sm text-destructive">
              El primer premio es requerido
            </p>
          )}
          
          <FormDescription>
            El valor y la moneda son opcionales. Puedes agregar tantos premios como desees.
          </FormDescription>
        </div>

        {/* Prize Display Mode - Only show if more than 1 prize */}
        {prizes.length > 1 && (
          <FormField
            control={form.control}
            name="prize_display_mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Cómo quieres mostrar los premios?</FormLabel>
                <Select 
                  value={field.value || 'hierarchical'} 
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un modo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRIZE_DISPLAY_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <span className="flex items-center gap-2">
                          {mode.label}
                          <span className="text-muted-foreground text-xs">({mode.description})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Elige cómo se verán los premios en la página pública del sorteo
                </FormDescription>
              </FormItem>
            )}
          />
        )}

        {/* Prize Images */}
        <FormField
          control={form.control}
          name="prize_images"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Imágenes del Premio</FormLabel>
              <FormControl>
              <div className="space-y-4">
                  {/* Image preview grid with drag and drop */}
                  {prizeImages.length > 0 && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleImageDragEnd}
                    >
                      <SortableContext items={prizeImages} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {prizeImages.map((url: string, index: number) => (
                            <SortableImage
                              key={url}
                              id={url}
                              url={url}
                              index={index}
                              onRemove={handleRemoveImage}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Upload dropzone */}
                  {prizeImages.length < MAX_IMAGES && (
                    <div
                      onClick={handleDropZoneClick}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      className={cn(
                        "border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer",
                        isUploading && "pointer-events-none opacity-50"
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                      />
                      
                      {isUploading ? (
                        <>
                          <Loader2 className="w-12 h-12 mx-auto text-primary mb-3 animate-spin" />
                          <p className="text-sm text-muted-foreground">
                            Subiendo imágenes... {Math.round(uploadProgress)}%
                          </p>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Arrastra imágenes aquí o haz clic para seleccionar
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Máximo {MAX_IMAGES} imágenes, 5MB cada una
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Las imágenes se mostrarán en la galería del sorteo ({prizeImages.length}/{MAX_IMAGES})
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="prize_video_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video del Premio (Opcional)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="https://youtube.com/watch?v=..." 
                    className="pl-10"
                    {...field} 
                  />
                </div>
              </FormControl>
              <FormDescription>
                Soporta YouTube y Vimeo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="prize_terms"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Términos del Premio</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateTerms}
                  disabled={isGeneratingTerms}
                  className="h-7 text-xs gap-1.5"
                >
                  {isGeneratingTerms ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Generar con IA
                </Button>
              </div>
              <FormControl>
                <Textarea 
                  placeholder="Condiciones de entrega, garantías, restricciones..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                La IA generará términos basándose en el premio y categoría del sorteo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

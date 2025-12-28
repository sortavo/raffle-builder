import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES } from '@/lib/currency-utils';
import { ImagePlus, Video, X, Loader2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REQUIRED_FIELDS } from '@/hooks/useWizardValidation';
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

interface Step2Props {
  form: UseFormReturn<any>;
}

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const Step2Prize = ({ form }: Step2Props) => {
  const currency = form.watch('currency_code') || 'MXN';
  const currencyData = CURRENCIES.find(c => c.code === currency);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const prizeImages = form.watch('prize_images') || [];

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: string): string | null => {
    if (!touchedFields[field]) return null;
    const value = form.watch(field);
    
    if (field === 'prize_name') {
      if (!value || value.trim().length === 0) {
        return REQUIRED_FIELDS.prize_name.message;
      }
    }
    return null;
  };

  const prizeNameError = getFieldError('prize_name');

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentImages = [...(form.getValues('prize_images') || [])];
      const oldIndex = currentImages.indexOf(active.id as string);
      const newIndex = currentImages.indexOf(over.id as string);
      
      const newOrder = arrayMove(currentImages, oldIndex, newIndex);
      form.setValue('prize_images', newOrder);
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
    
    for (let i = 0; i < fileArray.length; i++) {
      const url = await uploadImage(fileArray[i]);
      if (url) {
        uploadedUrls.push(url);
      }
      setUploadProgress(((i + 1) / fileArray.length) * 100);
    }

    if (uploadedUrls.length > 0) {
      form.setValue('prize_images', [...currentImages, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} imagen(es) subida(s)`);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración del Premio</CardTitle>
        <CardDescription>Define qué van a ganar los participantes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="prize_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                Nombre del Premio
                <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ej: Toyota Corolla 2024" 
                  {...field} 
                  onBlur={() => handleBlur('prize_name')}
                  className={cn(prizeNameError && "border-destructive focus-visible:ring-destructive")}
                />
              </FormControl>
              {prizeNameError && (
                <p className="text-sm font-medium text-destructive">{prizeNameError}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="prize_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor del Premio</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {currencyData?.symbol || '$'}
                    </span>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      className="pl-8"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || 'MXN'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.flag} {curr.code} - {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                      onDragEnd={handleDragEnd}
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
              <FormLabel>Términos del Premio</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Condiciones de entrega, garantías, restricciones..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

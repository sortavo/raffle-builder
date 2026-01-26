import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ColorSwatchProps {
  name: string;
  variable: string;
  className: string;
  textClassName?: string;
  description?: string;
}

const ColorSwatch = ({ name, variable, className, textClassName = "text-foreground", description }: ColorSwatchProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(variable);
    setCopied(true);
    toast.success(`Copiado: ${variable}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="group relative cursor-pointer"
      onClick={copyToClipboard}
    >
      <div className={cn(
        "h-20 rounded-lg border border-border/50 flex items-end p-3 transition-all",
        "hover:scale-105 hover:shadow-lg",
        className
      )}>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
      <div className="mt-2 space-y-0.5">
        <p className={cn("text-sm font-medium", textClassName)}>{name}</p>
        <p className="text-xs text-muted-foreground font-mono">{variable}</p>
        {description && (
          <p className="text-xs text-muted-foreground/70">{description}</p>
        )}
      </div>
    </div>
  );
};

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  columns?: string;
}

const Section = ({ title, description, children, columns = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" }: SectionProps) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    <div className={cn("grid gap-4", columns)}>
      {children}
    </div>
  </div>
);

interface TypographySampleProps {
  name: string;
  className: string;
  tailwindClass: string;
  sampleText?: string;
}

const TypographySample = ({ name, className, tailwindClass, sampleText = "Sortavo" }: TypographySampleProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tailwindClass);
    setCopied(true);
    toast.success(`Copiado: ${tailwindClass}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="group cursor-pointer p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-all"
      onClick={copyToClipboard}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{name}</span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? (
            <Check className="w-3 h-3 text-success" />
          ) : (
            <Copy className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </div>
      <p className={cn("text-foreground truncate", className)}>{sampleText}</p>
      <p className="text-xs text-muted-foreground font-mono mt-2">{tailwindClass}</p>
    </div>
  );
};

interface FontWeightSampleProps {
  weight: string;
  className: string;
  tailwindClass: string;
}

const FontWeightSample = ({ weight, className, tailwindClass }: FontWeightSampleProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tailwindClass);
    setCopied(true);
    toast.success(`Copiado: ${tailwindClass}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="group cursor-pointer p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-all"
      onClick={copyToClipboard}
    >
      <p className={cn("text-lg text-foreground", className)}>Aa</p>
      <p className="text-xs text-muted-foreground mt-1">{weight}</p>
      <p className="text-xs text-muted-foreground font-mono">{tailwindClass}</p>
    </div>
  );
};

export const ColorPalette = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            Sistema de Diseño
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Paleta de colores y tipografía "Negro & Esmeralda" de Sortavo. Haz clic en cualquier elemento para copiar su clase de Tailwind.
          </p>
        </div>

        {/* Typography - Font Families */}
        <Section 
          title="Tipografía - Familias" 
          description="Fuentes utilizadas en el sistema de diseño"
          columns="grid-cols-1 md:grid-cols-2"
        >
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sans (Predeterminada)</span>
              <span className="text-xs text-muted-foreground font-mono">font-sans</span>
            </div>
            <p className="text-3xl font-sans text-foreground">Inter</p>
            <p className="text-sm text-muted-foreground font-sans">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
              abcdefghijklmnopqrstuvwxyz<br />
              0123456789
            </p>
            <p className="text-xs text-muted-foreground">
              Fuente principal para todo el contenido. Optimizada para legibilidad en pantalla.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display</span>
              <span className="text-xs text-muted-foreground font-mono">font-display</span>
            </div>
            <p className="text-3xl font-display text-foreground">Inter</p>
            <p className="text-sm text-muted-foreground font-display">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
              abcdefghijklmnopqrstuvwxyz<br />
              0123456789
            </p>
            <p className="text-xs text-muted-foreground">
              Fuente para títulos y encabezados destacados.
            </p>
          </div>
        </Section>

        {/* Typography - Font Weights */}
        <Section 
          title="Tipografía - Pesos" 
          description="Variaciones de peso disponibles"
          columns="grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9"
        >
          <FontWeightSample weight="Thin" className="font-thin" tailwindClass="font-thin" />
          <FontWeightSample weight="Extra Light" className="font-extralight" tailwindClass="font-extralight" />
          <FontWeightSample weight="Light" className="font-light" tailwindClass="font-light" />
          <FontWeightSample weight="Normal" className="font-normal" tailwindClass="font-normal" />
          <FontWeightSample weight="Medium" className="font-medium" tailwindClass="font-medium" />
          <FontWeightSample weight="Semibold" className="font-semibold" tailwindClass="font-semibold" />
          <FontWeightSample weight="Bold" className="font-bold" tailwindClass="font-bold" />
          <FontWeightSample weight="Extra Bold" className="font-extrabold" tailwindClass="font-extrabold" />
          <FontWeightSample weight="Black" className="font-black" tailwindClass="font-black" />
        </Section>

        {/* Typography - Font Sizes */}
        <Section 
          title="Tipografía - Tamaños" 
          description="Escala tipográfica del sistema"
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          <TypographySample name="2XS (10px)" className="text-2xs" tailwindClass="text-2xs" />
          <TypographySample name="XS (12px)" className="text-xs" tailwindClass="text-xs" />
          <TypographySample name="SM (14px)" className="text-sm" tailwindClass="text-sm" />
          <TypographySample name="Base (16px)" className="text-base" tailwindClass="text-base" />
          <TypographySample name="LG (18px)" className="text-lg" tailwindClass="text-lg" />
          <TypographySample name="XL (20px)" className="text-xl" tailwindClass="text-xl" />
          <TypographySample name="2XL (24px)" className="text-2xl" tailwindClass="text-2xl" />
          <TypographySample name="3XL (30px)" className="text-3xl" tailwindClass="text-3xl" />
          <TypographySample name="4XL (36px)" className="text-4xl" tailwindClass="text-4xl" />
          <TypographySample name="5XL (48px)" className="text-5xl" tailwindClass="text-5xl" />
          <TypographySample name="6XL (60px)" className="text-6xl" tailwindClass="text-6xl" />
          <TypographySample name="7XL (72px)" className="text-7xl" tailwindClass="text-7xl" />
        </Section>

        {/* Typography Examples */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Ejemplos de Tipografía</h3>
          <div className="p-6 rounded-xl border border-border bg-card space-y-6">
            <div className="space-y-2">
              <p className="text-5xl font-bold tracking-tight text-foreground">Título Principal</p>
              <p className="text-xs text-muted-foreground font-mono">text-5xl font-bold tracking-tight</p>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-semibold text-foreground">Subtítulo de Sección</p>
              <p className="text-xs text-muted-foreground font-mono">text-3xl font-semibold</p>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-medium text-foreground">Encabezado de Componente</p>
              <p className="text-xs text-muted-foreground font-mono">text-xl font-medium</p>
            </div>
            <div className="space-y-2">
              <p className="text-base text-foreground">Texto de párrafo normal con tamaño base para contenido general y descripciones.</p>
              <p className="text-xs text-muted-foreground font-mono">text-base</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Texto secundario o de ayuda con menor énfasis visual.</p>
              <p className="text-xs text-muted-foreground font-mono">text-sm text-muted-foreground</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground/70">Caption o texto muy pequeño para etiquetas y metadata.</p>
              <p className="text-xs text-muted-foreground font-mono">text-xs text-muted-foreground/70</p>
            </div>
          </div>
        </div>

        {/* Base Colors */}
        <Section 
          title="Colores Base" 
          description="Fondos y texto principales de la aplicación"
        >
          <ColorSwatch
            name="Background"
            variable="bg-background"
            className="bg-background"
            description="Fondo principal"
          />
          <ColorSwatch
            name="Foreground"
            variable="text-foreground"
            className="bg-foreground"
            description="Texto principal"
          />
          <ColorSwatch
            name="Card"
            variable="bg-card"
            className="bg-card"
            description="Fondo de tarjetas"
          />
          <ColorSwatch
            name="Card Foreground"
            variable="text-card-foreground"
            className="bg-card-foreground"
            description="Texto en tarjetas"
          />
          <ColorSwatch
            name="Muted"
            variable="bg-muted"
            className="bg-muted"
            description="Fondos secundarios"
          />
          <ColorSwatch
            name="Muted Foreground"
            variable="text-muted-foreground"
            className="bg-muted-foreground"
            description="Texto secundario"
          />
        </Section>

        {/* Brand Colors */}
        <Section 
          title="Colores de Marca" 
          description="Esmeralda como color primario, dorado como acento"
        >
          <ColorSwatch
            name="Primary"
            variable="bg-primary"
            className="bg-primary"
            description="Color principal"
          />
          <ColorSwatch
            name="Primary Foreground"
            variable="text-primary-foreground"
            className="bg-primary-foreground"
            description="Texto sobre primary"
          />
          <ColorSwatch
            name="Accent"
            variable="bg-accent"
            className="bg-accent"
            description="Acentos dorados"
          />
          <ColorSwatch
            name="Accent Foreground"
            variable="text-accent-foreground"
            className="bg-accent-foreground"
            description="Texto sobre accent"
          />
          <ColorSwatch
            name="Secondary"
            variable="bg-secondary"
            className="bg-secondary"
            description="Elementos secundarios"
          />
          <ColorSwatch
            name="Secondary Foreground"
            variable="text-secondary-foreground"
            className="bg-secondary-foreground"
            description="Texto sobre secondary"
          />
        </Section>

        {/* Primary Opacities */}
        <Section 
          title="Primary con Opacidades" 
          description="Variaciones del color primario para diferentes contextos"
        >
          <ColorSwatch
            name="Primary 100%"
            variable="bg-primary"
            className="bg-primary"
          />
          <ColorSwatch
            name="Primary 80%"
            variable="bg-primary/80"
            className="bg-primary/80"
          />
          <ColorSwatch
            name="Primary 60%"
            variable="bg-primary/60"
            className="bg-primary/60"
          />
          <ColorSwatch
            name="Primary 40%"
            variable="bg-primary/40"
            className="bg-primary/40"
          />
          <ColorSwatch
            name="Primary 20%"
            variable="bg-primary/20"
            className="bg-primary/20"
          />
          <ColorSwatch
            name="Primary 10%"
            variable="bg-primary/10"
            className="bg-primary/10"
          />
        </Section>

        {/* Semantic States */}
        <Section 
          title="Estados Semánticos" 
          description="Colores para estados de éxito, advertencia, error e información"
        >
          <ColorSwatch
            name="Success"
            variable="bg-success"
            className="bg-success"
            description="Éxito, confirmado"
          />
          <ColorSwatch
            name="Success 20%"
            variable="bg-success/20"
            className="bg-success/20"
            description="Fondo de éxito"
          />
          <ColorSwatch
            name="Warning"
            variable="bg-warning"
            className="bg-warning"
            description="Advertencia, pendiente"
          />
          <ColorSwatch
            name="Warning 20%"
            variable="bg-warning/20"
            className="bg-warning/20"
            description="Fondo de advertencia"
          />
          <ColorSwatch
            name="Destructive"
            variable="bg-destructive"
            className="bg-destructive"
            description="Error, eliminar"
          />
          <ColorSwatch
            name="Destructive 20%"
            variable="bg-destructive/20"
            className="bg-destructive/20"
            description="Fondo de error"
          />
          <ColorSwatch
            name="Info"
            variable="bg-info"
            className="bg-info"
            description="Información"
          />
          <ColorSwatch
            name="Info 20%"
            variable="bg-info/20"
            className="bg-info/20"
            description="Fondo de info"
          />
        </Section>

        {/* Borders & Rings */}
        <Section 
          title="Bordes y Anillos" 
          description="Colores para bordes, separadores y estados de focus"
        >
          <ColorSwatch
            name="Border"
            variable="border-border"
            className="bg-border"
            description="Bordes generales"
          />
          <ColorSwatch
            name="Input"
            variable="border-input"
            className="bg-input"
            description="Bordes de inputs"
          />
          <ColorSwatch
            name="Ring"
            variable="ring-ring"
            className="bg-ring"
            description="Anillos de focus"
          />
        </Section>

        {/* Gradients */}
        <Section 
          title="Gradientes de Marca" 
          description="Combinaciones de gradientes predefinidas"
        >
          <div className="col-span-2">
            <div className="h-20 rounded-lg bg-gradient-to-r from-primary via-primary/80 to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-medium text-sm">
                from-primary via-primary/80 to-accent
              </span>
            </div>
            <p className="mt-2 text-sm font-medium">Gradiente Principal</p>
            <p className="text-xs text-muted-foreground font-mono">bg-gradient-to-r from-primary via-primary/80 to-accent</p>
          </div>
          <div className="col-span-2">
            <div className="h-20 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-medium text-sm">
                from-primary to-accent
              </span>
            </div>
            <p className="mt-2 text-sm font-medium">Gradiente Diagonal</p>
            <p className="text-xs text-muted-foreground font-mono">bg-gradient-to-br from-primary to-accent</p>
          </div>
          <div className="col-span-2">
            <div className="h-20 rounded-lg bg-gradient-to-r from-background via-muted to-background flex items-center justify-center border border-border/50">
              <span className="text-foreground font-medium text-sm">
                from-background via-muted to-background
              </span>
            </div>
            <p className="mt-2 text-sm font-medium">Gradiente Sutil</p>
            <p className="text-xs text-muted-foreground font-mono">bg-gradient-to-r from-background via-muted to-background</p>
          </div>
        </Section>

        {/* Usage Examples */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Ejemplos de Componentes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Button Examples */}
            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <h4 className="font-medium text-card-foreground">Botones</h4>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  Primary
                </button>
                <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                  Secondary
                </button>
                <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors">
                  Destructive
                </button>
              </div>
            </div>

            {/* Badge Examples */}
            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <h4 className="font-medium text-card-foreground">Badges</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-success/20 text-success border border-success/50 rounded-full text-xs font-medium">
                  Confirmado
                </span>
                <span className="px-3 py-1 bg-warning/20 text-warning border border-warning/50 rounded-full text-xs font-medium">
                  Pendiente
                </span>
                <span className="px-3 py-1 bg-destructive/20 text-destructive border border-destructive/50 rounded-full text-xs font-medium">
                  Cancelado
                </span>
                <span className="px-3 py-1 bg-info/20 text-info border border-info/50 rounded-full text-xs font-medium">
                  Info
                </span>
              </div>
            </div>

            {/* Card Example */}
            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <h4 className="font-medium text-card-foreground">Tarjeta</h4>
              <div className="p-4 rounded-lg bg-muted border border-border">
                <p className="text-sm text-muted-foreground">
                  Contenido dentro de una tarjeta con fondo muted.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            Sistema de diseño "Negro & Esmeralda" • Sortavo 2024
          </p>
        </div>
      </div>
    </div>
  );
};

export default ColorPalette;

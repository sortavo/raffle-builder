import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, Building2, Link as LinkIcon, Check, X, Copy, ExternalLink, AlertTriangle, Sparkles, Eye, Facebook, Instagram, Globe, MessageCircle, MapPin, Image, Mail, Phone } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { OrganizationPreview } from "./OrganizationPreview";
import { MultiContactInput } from "./MultiContactInput";
import { PhoneInputWithCountry } from "./PhoneInputWithCountry";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeToSlug, isValidSlug, getOrganizationPublicUrl, isReservedSlug } from "@/lib/url-utils";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const organizationSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  country_code: z.string().min(2, "Selecciona un país"),
  currency_code: z.string().min(3, "Selecciona una moneda"),
  timezone: z.string().min(1, "Selecciona una zona horaria"),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido"),
  slug: z.string().optional(),
  description: z.string().optional(),
  city: z.string().optional(),
  website_url: z.string().url("URL inválida").optional().or(z.literal("")),
  facebook_url: z.string().url("URL inválida").optional().or(z.literal("")),
  instagram_url: z.string().url("URL inválida").optional().or(z.literal("")),
  tiktok_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

const COUNTRIES = [
  { code: "MX", name: "México" },
  { code: "US", name: "Estados Unidos" },
  { code: "ES", name: "España" },
  { code: "CO", name: "Colombia" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Perú" },
];

const CURRENCIES = [
  { code: "MXN", name: "Peso Mexicano (MXN)" },
  { code: "USD", name: "Dólar (USD)" },
  { code: "EUR", name: "Euro (EUR)" },
  { code: "COP", name: "Peso Colombiano (COP)" },
  { code: "ARS", name: "Peso Argentino (ARS)" },
];

const TIMEZONES = [
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/New_York", label: "Nueva York (GMT-5)" },
  { value: "America/Los_Angeles", label: "Los Ángeles (GMT-8)" },
  { value: "America/Bogota", label: "Bogotá (GMT-5)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
];

export function OrganizationSettings() {
  const { organization, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [slugInput, setSlugInput] = useState("");
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  
  // State for multiple contacts (arrays)
  const [emails, setEmails] = useState<string[]>([]);
  const [phones, setPhones] = useState<string[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<string[]>([]);
  const [showPhoneValidation, setShowPhoneValidation] = useState(false);
  
  const suggestedSlug = organization?.name ? normalizeToSlug(organization.name) : "";
  const hasExistingSlug = Boolean(organization?.slug);
  const isChangingSlug = hasExistingSlug && slugInput !== organization?.slug;

  // Sync slugInput with organization.slug when it loads
  useEffect(() => {
    if (organization?.slug && !slugInput) {
      setSlugInput(organization.slug);
    }
  }, [organization?.slug]);
  
  // Sync contact arrays with organization data
  useEffect(() => {
    if (organization) {
      const org = organization as any;
      // Use the new array fields, falling back to legacy single values
      setEmails(org.emails?.length > 0 ? org.emails : (org.email ? [org.email] : []));
      setPhones(org.phones?.length > 0 ? org.phones : (org.phone ? [org.phone] : []));
      setWhatsappNumbers(org.whatsapp_numbers?.length > 0 ? org.whatsapp_numbers : (org.whatsapp_number ? [org.whatsapp_number] : []));
    }
  }, [organization]);
  
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada al portapapeles");
    } catch {
      toast.error("Error al copiar la URL");
    }
  };
  
  const applySuggestedSlug = () => {
    if (suggestedSlug) {
      setSlugInput(suggestedSlug);
    }
  };

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || "",
      country_code: organization?.country_code || "MX",
      currency_code: organization?.currency_code || "MXN",
      timezone: organization?.timezone || "America/Mexico_City",
      brand_color: organization?.brand_color || "#2563EB",
      slug: organization?.slug || "",
      description: (organization as any)?.description || "",
      city: (organization as any)?.city || "",
      website_url: (organization as any)?.website_url || "",
      facebook_url: (organization as any)?.facebook_url || "",
      instagram_url: (organization as any)?.instagram_url || "",
      tiktok_url: (organization as any)?.tiktok_url || "",
    },
  });

  // Update form when organization data loads
  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name || "",
        country_code: organization.country_code || "MX",
        currency_code: organization.currency_code || "MXN",
        timezone: organization.timezone || "America/Mexico_City",
        brand_color: organization.brand_color || "#2563EB",
        slug: organization.slug || "",
        description: (organization as any)?.description || "",
        city: (organization as any)?.city || "",
        website_url: (organization as any)?.website_url || "",
        facebook_url: (organization as any)?.facebook_url || "",
        instagram_url: (organization as any)?.instagram_url || "",
        tiktok_url: (organization as any)?.tiktok_url || "",
      });
    }
  }, [organization]);

  // Check slug availability with debounce
  useEffect(() => {
    setSlugError(null);
    
    if (!slugInput || slugInput === organization?.slug) {
      setSlugAvailable(null);
      return;
    }

    if (!isValidSlug(slugInput)) {
      setSlugAvailable(false);
      setSlugError("Solo letras minúsculas, números y guiones");
      return;
    }
    
    if (isReservedSlug(slugInput)) {
      setSlugAvailable(false);
      setSlugError("Este nombre está reservado por el sistema");
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("id")
          .eq("slug", slugInput)
          .maybeSingle();

        if (error) {
          console.error("Error checking slug:", error);
          setSlugAvailable(null);
        } else {
          setSlugAvailable(!data);
          if (data) {
            setSlugError("Este slug ya está en uso");
          }
        }
      } catch (err) {
        setSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slugInput, organization?.slug]);

  const onSubmit = async (data: OrganizationFormData) => {
    if (!organization?.id) return;

    // Validate slug if provided
    if (slugInput && !isValidSlug(slugInput)) {
      toast.error("El slug solo puede contener letras minúsculas, números y guiones");
      return;
    }
    
    if (slugInput && isReservedSlug(slugInput)) {
      toast.error("Este nombre está reservado por el sistema");
      return;
    }

    if (slugInput && slugAvailable === false) {
      toast.error(slugError || "Este slug ya está en uso");
      return;
    }

    setIsSubmitting(true);
    try {
      // Filter out empty values from arrays
      const filteredEmails = emails.filter(e => e.trim());
      const filteredPhones = phones.filter(p => p.trim());
      const filteredWhatsapps = whatsappNumbers.filter(w => w.trim());
      
      // Validate at least one email
      if (filteredEmails.length === 0) {
        toast.error("Debes agregar al menos un email de contacto");
        setIsSubmitting(false);
        return;
      }
      
      // Validate phone numbers have exactly 10 digits
      const validatePhoneDigits = (phone: string) => {
        // Extract just the number part (after country code)
        for (const country of ["+593", "+502", "+503", "+504", "+505", "+506", "+507", "+591", "+595", "+598", "+52", "+34", "+57", "+54", "+56", "+51", "+58", "+1"]) {
          if (phone.startsWith(country)) {
            const number = phone.slice(country.length);
            return number.length === 10;
          }
        }
        return true; // If no country code found, skip validation
      };
      
      const invalidPhones = filteredPhones.filter(p => !validatePhoneDigits(p));
      if (invalidPhones.length > 0) {
        setShowPhoneValidation(true);
        toast.error("Todos los teléfonos deben tener exactamente 10 dígitos");
        setIsSubmitting(false);
        return;
      }
      
      const invalidWhatsapps = filteredWhatsapps.filter(w => !validatePhoneDigits(w));
      if (invalidWhatsapps.length > 0) {
        setShowPhoneValidation(true);
        toast.error("Todos los números de WhatsApp deben tener exactamente 10 dígitos");
        setIsSubmitting(false);
        return;
      }
      
      setShowPhoneValidation(false);
      
      const { error } = await supabase
        .from("organizations")
        .update({
          name: data.name,
          // Store first values in legacy fields for compatibility
          email: filteredEmails[0] || organization?.email,
          phone: filteredPhones[0] || null,
          whatsapp_number: filteredWhatsapps[0] || null,
          // Store arrays in new fields
          emails: filteredEmails,
          phones: filteredPhones,
          whatsapp_numbers: filteredWhatsapps,
          country_code: data.country_code,
          currency_code: data.currency_code,
          timezone: data.timezone,
          brand_color: data.brand_color,
          slug: slugInput || null,
          description: data.description || null,
          city: data.city || null,
          website_url: data.website_url || null,
          facebook_url: data.facebook_url || null,
          instagram_url: data.instagram_url || null,
          tiktok_url: data.tiktok_url || null,
        })
        .eq("id", organization.id);

      if (error) throw error;

      toast.success("Organización actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    } catch (error: any) {
      if (error.message?.includes("duplicate key")) {
        toast.error("Este slug ya está en uso por otra organización");
      } else {
        toast.error("Error al actualizar: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("El logo debe ser menor a 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${organization.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: publicUrl })
        .eq("id", organization.id);

      if (updateError) throw updateError;

      toast.success("Logo actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    } catch (error: any) {
      toast.error("Error al subir logo: " + error.message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen de portada debe ser menor a 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    setIsUploadingCover(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${organization.id}/cover.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ cover_image_url: publicUrl })
        .eq("id", organization.id);

      if (updateError) throw updateError;

      toast.success("Imagen de portada actualizada");
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    } catch (error: any) {
      toast.error("Error al subir imagen: " + error.message);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const coverImageUrl = (organization as any)?.cover_image_url;

  return (
    <div className="space-y-6">
      {/* Logo & Cover Section */}
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Imágenes de la Organización</CardTitle>
          <CardDescription>
            Logo y portada que aparecerán en tu página pública
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 ring-2 ring-border/50 ring-offset-2 ring-offset-background">
              <AvatarImage src={organization?.logo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                <Building2 className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Logo</Label>
              <Button
                variant="outline"
                disabled={isUploadingLogo}
                onClick={() => document.getElementById("logo-upload")?.click()}
                className="shadow-sm"
              >
                {isUploadingLogo ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isUploadingLogo ? "Subiendo..." : "Subir Logo"}
              </Button>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG o GIF. Máximo 2MB.
              </p>
            </div>
          </div>

          {/* Cover Image */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Imagen de Portada</Label>
            <div 
              className="relative h-32 w-full rounded-lg overflow-hidden bg-muted border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById("cover-upload")?.click()}
            >
              {coverImageUrl ? (
                <img 
                  src={coverImageUrl} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <Image className="h-8 w-8" />
                  <span className="text-sm">Click para subir imagen de portada</span>
                </div>
              )}
              {isUploadingCover && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <input
              id="cover-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
            <p className="text-xs text-muted-foreground">
              Recomendado: 1920x400px. Máximo 5MB.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Public URL / Slug Section */}
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LinkIcon className="h-5 w-5 text-primary" />
                URL Pública de la Organización
              </CardTitle>
              <CardDescription>
                Configura una URL personalizada para tu página de sorteos
              </CardDescription>
            </div>
            {hasExistingSlug && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                <Check className="h-3 w-3 mr-1" />
                Configurado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Identificador único (slug)</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  id="slug"
                  value={slugInput}
                  onChange={(e) => setSlugInput(normalizeToSlug(e.target.value))}
                  placeholder="mi-organizacion"
                  className="pr-10"
                />
                {isCheckingSlug && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!isCheckingSlug && slugAvailable === true && slugInput && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {!isCheckingSlug && slugAvailable === false && slugInput && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Solo letras minúsculas, números y guiones. Ejemplo: mi-organizacion
            </p>
            
            {/* Tu URL Section - Always visible */}
            <div className="mt-3">
              <Label className="text-sm font-medium mb-2 block">Tu URL</Label>
              
              {/* Case 1: Has valid slugInput */}
              {slugInput && isValidSlug(slugInput) && (
                <div className={`p-3 rounded-lg border ${
                  slugInput === organization?.slug 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-muted border-border'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge 
                      variant={slugInput === organization?.slug ? "default" : "secondary"}
                      className={slugInput === organization?.slug ? "bg-green-600" : ""}
                    >
                      {slugInput === organization?.slug ? "URL Activa" : "Vista previa"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyUrl(getOrganizationPublicUrl(slugInput))}
                        className="h-7 px-2"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copiar
                      </Button>
                      {slugInput === organization?.slug && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-7 px-2"
                        >
                          <a href={getOrganizationPublicUrl(slugInput)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Visitar
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  <code className={`text-sm break-all block ${
                    slugInput === organization?.slug 
                      ? 'text-green-700 dark:text-green-400' 
                      : 'text-foreground'
                  }`}>
                    {getOrganizationPublicUrl(slugInput)}
                  </code>
                  {slugInput !== organization?.slug && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Guarda los cambios para activar esta URL
                    </p>
                  )}
                </div>
              )}
              
              {/* Case 2: Empty input but has suggestion */}
              {!slugInput && suggestedSlug && (
                <div className="p-3 rounded-lg border bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <Badge variant="outline">Sugerencia</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyUrl(getOrganizationPublicUrl(suggestedSlug))}
                        className="h-7 px-2"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copiar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applySuggestedSlug}
                        className="h-7"
                      >
                        Usar sugerencia
                      </Button>
                    </div>
                  </div>
                  <code className="text-sm break-all block text-foreground">
                    {getOrganizationPublicUrl(suggestedSlug)}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Basada en el nombre de tu organización
                  </p>
                </div>
              )}
              
              {/* Case 3: Empty input and no suggestion */}
              {!slugInput && !suggestedSlug && (
                <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
                  <p className="text-sm text-muted-foreground text-center">
                    Escribe un identificador arriba para ver tu URL
                  </p>
                </div>
              )}
            </div>
            
            {slugError && slugInput && !isCheckingSlug && (
              <p className="text-sm text-destructive">
                {slugError}
              </p>
            )}
          </div>

          {/* Warning when changing existing slug */}
          {isChangingSlug && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    ¿Estás seguro de cambiar el slug?
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Los enlaces existentes dejarán de funcionar. Asegúrate de actualizar todos los enlaces que hayas compartido.
                  </p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-muted-foreground">
                      <span className="line-through">{getOrganizationPublicUrl(organization?.slug!)}</span>
                    </p>
                    <p className="text-foreground font-medium">
                      → {getOrganizationPublicUrl(slugInput)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Section */}
          {slugInput && isValidSlug(slugInput) && slugAvailable !== false && (
            <Collapsible className="mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-center gap-2">
                  <Eye className="h-4 w-4" />
                  Ver preview de tu página pública
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <OrganizationPreview
                  name={form.watch("name") || organization?.name || ""}
                  slug={slugInput}
                  logoUrl={organization?.logo_url}
                  brandColor={form.watch("brand_color") || organization?.brand_color || "#2563EB"}
                  email={emails[0] || organization?.email}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Organization Details */}
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Información de la Organización</CardTitle>
          <CardDescription>
            Datos básicos de tu organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Organización</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Mi Organización"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Ciudad / Ubicación
                </Label>
                <Input
                  id="city"
                  {...form.register("city")}
                  placeholder="Ciudad de México, MX"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Cuéntanos sobre tu organización..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Esta descripción aparecerá en tu página pública
                </p>
              </div>

              <div className="space-y-2">
                <Label>País</Label>
                <Select
                  value={form.watch("country_code")}
                  onValueChange={(value) => form.setValue("country_code", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un país" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select
                  value={form.watch("currency_code")}
                  onValueChange={(value) => form.setValue("currency_code", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Zona Horaria</Label>
                <Select
                  value={form.watch("timezone")}
                  onValueChange={(value) => form.setValue("timezone", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una zona horaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand_color">Color de Marca</Label>
                <div className="flex gap-2">
                  <Input
                    id="brand_color"
                    type="color"
                    {...form.register("brand_color")}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={form.watch("brand_color")}
                    onChange={(e) => form.setValue("brand_color", e.target.value)}
                    placeholder="#2563EB"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section - Multi-contact inputs */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4">Información de Contacto</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Puedes agregar hasta 5 de cada tipo de contacto
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <MultiContactInput
                  label="Email"
                  icon={<Mail className="h-4 w-4" />}
                  values={emails}
                  onChange={setEmails}
                  placeholder="contacto@ejemplo.com"
                  type="email"
                  required
                  helperText="El primer email será el principal"
                />
                
                <PhoneInputWithCountry
                  label="Teléfono"
                  icon={<Phone className="h-4 w-4" />}
                  values={phones}
                  onChange={setPhones}
                  helperText="Solo ingresa los dígitos del número"
                  showValidation={showPhoneValidation}
                />
                
                <PhoneInputWithCountry
                  label="WhatsApp"
                  icon={<MessageCircle className="h-4 w-4" />}
                  values={whatsappNumbers}
                  onChange={setWhatsappNumbers}
                  helperText="Solo ingresa los dígitos del número"
                  showValidation={showPhoneValidation}
                />
              </div>
            </div>

            {/* Social Links Section */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4">Redes Sociales</h3>
              <div className="grid gap-4 sm:grid-cols-2">

                <div className="space-y-2">
                  <Label htmlFor="website_url">
                    <Globe className="inline h-4 w-4 mr-1" />
                    Sitio Web
                  </Label>
                  <Input
                    id="website_url"
                    {...form.register("website_url")}
                    placeholder="https://misitioweb.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook_url">
                    <Facebook className="inline h-4 w-4 mr-1" />
                    Facebook
                  </Label>
                  <Input
                    id="facebook_url"
                    {...form.register("facebook_url")}
                    placeholder="https://facebook.com/miorganizacion"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram_url">
                    <Instagram className="inline h-4 w-4 mr-1" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram_url"
                    {...form.register("instagram_url")}
                    placeholder="https://instagram.com/miorganizacion"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tiktok_url">
                    <TikTokIcon className="inline h-4 w-4 mr-1" />
                    TikTok
                  </Label>
                  <Input
                    id="tiktok_url"
                    {...form.register("tiktok_url")}
                    placeholder="https://tiktok.com/@miorganizacion"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

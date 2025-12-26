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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, Building2, Link as LinkIcon, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeToSlug, isValidSlug, getOrganizationPublicUrl } from "@/lib/url-utils";

const organizationSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  country_code: z.string().min(2, "Selecciona un país"),
  currency_code: z.string().min(3, "Selecciona una moneda"),
  timezone: z.string().min(1, "Selecciona una zona horaria"),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido"),
  slug: z.string().optional(),
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
  const [slugInput, setSlugInput] = useState(organization?.slug || "");
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || "",
      email: organization?.email || "",
      phone: organization?.phone || "",
      country_code: organization?.country_code || "MX",
      currency_code: organization?.currency_code || "MXN",
      timezone: organization?.timezone || "America/Mexico_City",
      brand_color: organization?.brand_color || "#2563EB",
      slug: organization?.slug || "",
    },
  });

  // Check slug availability with debounce
  useEffect(() => {
    if (!slugInput || slugInput === organization?.slug) {
      setSlugAvailable(null);
      return;
    }

    if (!isValidSlug(slugInput)) {
      setSlugAvailable(false);
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

    if (slugInput && slugAvailable === false) {
      toast.error("Este slug ya está en uso");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          country_code: data.country_code,
          currency_code: data.currency_code,
          timezone: data.timezone,
          brand_color: data.brand_color,
          slug: slugInput || null,
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

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle>Logo de la Organización</CardTitle>
          <CardDescription>
            Este logo aparecerá en tus sorteos públicos
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={organization?.logo_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              <Building2 className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Button
              variant="outline"
              disabled={isUploadingLogo}
              onClick={() => document.getElementById("logo-upload")?.click()}
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
        </CardContent>
      </Card>

      {/* Public URL / Slug Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            URL Pública de la Organización
          </CardTitle>
          <CardDescription>
            Configura una URL personalizada para tu página de sorteos
          </CardDescription>
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
            {slugAvailable === false && slugInput && !isCheckingSlug && (
              <p className="text-sm text-destructive">
                Este slug ya está en uso
              </p>
            )}
          </div>

          {slugInput && isValidSlug(slugInput) && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Preview de tu URL pública:</p>
              <code className="text-sm text-primary break-all">
                {getOrganizationPublicUrl(slugInput)}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Tus sorteos estarán disponibles en: {getOrganizationPublicUrl(slugInput)}/nombre-del-sorteo
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Organización</CardTitle>
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
                <Label htmlFor="email">Email de Contacto</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="contacto@ejemplo.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="+52 55 1234 5678"
                />
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

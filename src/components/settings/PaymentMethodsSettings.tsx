import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentMethods, PaymentMethod } from "@/hooks/usePaymentMethods";
import { PaymentMethodsPreview } from "./PaymentMethodsPreview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  CreditCard, 
  Landmark, 
  Wallet, 
  Plus,
  Trash2,
  GripVertical,
  Edit2,
  Check,
  Loader2,
  Store,
  Pill,
  ShoppingBag,
  HandCoins,
  ArrowRightLeft,
  Link as LinkIcon,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Globe,
  QrCode,
  ArrowLeft
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BankBadge, BankSelectItem } from "@/components/ui/BankBadge";
import { BANK_NAMES } from "@/lib/bank-config";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  COUNTRY_PAYMENT_CONFIGS, 
  getAllCountries, 
  getCountryConfig,
  CATEGORY_LABELS,
  type CountryPaymentConfig,
  type PaymentMethodConfig
} from "@/lib/country-payment-methods";

type PaymentSubtype = string;

// Get bank list for a country (currently Mexican banks as fallback)
const getBankListForCountry = (countryCode: string): readonly string[] => {
  // Could expand this to have country-specific bank lists
  return [...BANK_NAMES, 'Otro'] as const;
};

interface EditingMethod {
  id?: string;
  subtype: PaymentSubtype;
  name: string;
  instructions: string;
  enabled: boolean;
  // Bank selection
  bank_select_value: string;
  bank_name: string;
  account_number: string;
  clabe: string;
  account_holder: string;
  card_number: string;
  // Digital fields
  paypal_email: string;
  paypal_link: string;
  payment_link: string;
  // Cash in person fields
  location: string;
  schedule: string;
  // Grouping
  group_id: string | null;
  // Custom method fields
  custom_label: string;
  custom_identifier: string;
  custom_identifier_label: string;
  custom_qr_url: string;
  currency: string;
  // Country
  country: string;
}

const getDefaultEditingMethod = (subtype: PaymentSubtype, countryCode: string = 'MX'): EditingMethod => {
  const config = getCountryConfig(countryCode);
  const methodInfo = config ? 
    [...config.methods.bank, ...config.methods.store, ...config.methods.digital, ...config.methods.cash].find(m => m.id === subtype) :
    null;
  
  return {
    subtype,
    name: methodInfo?.label || 'Nuevo método',
    instructions: "",
    enabled: true,
    bank_select_value: "",
    bank_name: "",
    account_number: "",
    clabe: "",
    account_holder: "",
    card_number: "",
    paypal_email: "",
    paypal_link: "",
    payment_link: "",
    location: "",
    schedule: "",
    group_id: null,
    custom_label: "",
    custom_identifier: "",
    custom_identifier_label: "email",
    custom_qr_url: "",
    currency: config?.currency || "MXN",
    country: countryCode,
  };
};

// Helper to get icon for a method - searches across all countries
const getIcon = (subtype: string | null | undefined, countryCode?: string) => {
  if (!subtype) return <CreditCard className="h-5 w-5" />;
  
  // Search in specified country or all countries
  const countries = countryCode ? [getCountryConfig(countryCode)].filter(Boolean) : getAllCountries();
  
  for (const country of countries) {
    if (!country) continue;
    const allMethods = [...country.methods.bank, ...country.methods.store, ...country.methods.digital, ...country.methods.cash];
    const found = allMethods.find(m => m.id === subtype);
    if (found) {
      const Icon = found.icon;
      return <Icon className="h-5 w-5" />;
    }
  }
  return <CreditCard className="h-5 w-5" />;
};

// Helper to get label for a method
const getSubtypeLabel = (subtype: string | null | undefined, countryCode?: string) => {
  if (!subtype) return 'Método de pago';
  
  const countries = countryCode ? [getCountryConfig(countryCode)].filter(Boolean) : getAllCountries();
  
  for (const country of countries) {
    if (!country) continue;
    const allMethods = [...country.methods.bank, ...country.methods.store, ...country.methods.digital, ...country.methods.cash];
    const found = allMethods.find(m => m.id === subtype);
    if (found) return found.label;
  }
  return subtype;
};

// Validation helpers
const isValidClabe = (clabe: string): boolean => {
  const digits = clabe.replace(/\D/g, '');
  return digits.length === 18;
};

const isValidCardNumber = (card: string): boolean => {
  const digits = card.replace(/\D/g, '');
  return digits.length === 16;
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Group methods by group_id for display
interface MethodGroup {
  groupId: string | null;
  methods: PaymentMethod[];
  bankName: string | null;
  accountHolder: string | null;
}

function groupMethodsByAccount(methods: PaymentMethod[]): MethodGroup[] {
  const groups = new Map<string, PaymentMethod[]>();
  const ungrouped: PaymentMethod[] = [];
  
  methods.forEach(method => {
    if (method.group_id) {
      const existing = groups.get(method.group_id) || [];
      groups.set(method.group_id, [...existing, method]);
    } else {
      ungrouped.push(method);
    }
  });
  
  const result: MethodGroup[] = [];
  
  // Add grouped methods
  groups.forEach((groupMethods, groupId) => {
    const firstMethod = groupMethods[0];
    result.push({
      groupId,
      methods: groupMethods,
      bankName: firstMethod.bank_name,
      accountHolder: firstMethod.account_holder,
    });
  });
  
  // Add ungrouped methods as individual groups
  ungrouped.forEach(method => {
    result.push({
      groupId: null,
      methods: [method],
      bankName: method.bank_name,
      accountHolder: method.account_holder,
    });
  });
  
  return result;
}

interface AccountCardProps {
  group: MethodGroup;
  onEdit: (method: PaymentMethod) => void;
  onDelete: (groupId: string | null, methodIds: string[]) => void;
  onToggle: (method: PaymentMethod) => void;
  isToggling: boolean;
}

function AccountCard({ group, onEdit, onDelete, onToggle, isToggling }: AccountCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const allEnabled = group.methods.every(m => m.enabled);
  const someEnabled = group.methods.some(m => m.enabled);
  const firstMethod = group.methods[0];
  
  const methodIds = group.methods.map(m => m.id);
  
  return (
    <Card className={`border-border/50 shadow-sm hover:shadow-md transition-all duration-300 ${!someEnabled ? "opacity-60" : ""}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${someEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {firstMethod.bank_name ? (
                <Landmark className="h-5 w-5" />
              ) : (
                getIcon(firstMethod.subtype)
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {group.bankName && (
                  <BankBadge bankName={group.bankName} size="sm" />
                )}
                {!group.bankName && (
                  <h4 className="font-medium truncate text-sm sm:text-base">{firstMethod.name}</h4>
                )}
              </div>
              
              {/* Methods as chips */}
              <div className="flex flex-wrap gap-1 mb-2">
                {group.methods.map(method => (
                  <span 
                    key={method.id} 
                    className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                      method.enabled 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {getIcon(method.subtype)}
                    <span className="truncate max-w-[80px] sm:max-w-[100px]">{getSubtypeLabel(method.subtype)}</span>
                  </span>
                ))}
              </div>

              {/* Account info */}
              {firstMethod.clabe && (
                <p className="text-xs sm:text-sm text-muted-foreground font-mono break-all">
                  CLABE: {firstMethod.clabe}
                </p>
              )}
              {firstMethod.account_holder && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {firstMethod.account_holder}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-3 sm:border-0 sm:pt-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(firstMethod)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(group.groupId, methodIds)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Switch
              checked={allEnabled}
              onCheckedChange={() => {
                // Toggle all methods in the group
                group.methods.forEach(m => onToggle(m));
              }}
              disabled={isToggling}
            />
          </div>
        </div>

        {/* Expandable section for individual method controls */}
        {group.methods.length > 1 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Ocultar métodos individuales
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Ver {group.methods.length} métodos
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {group.methods.map(method => (
                <div 
                  key={method.id} 
                  className="flex items-center justify-between p-2 rounded bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {getIcon(method.subtype)}
                    <span className="text-sm">{getSubtypeLabel(method.subtype)}</span>
                  </div>
                  <Switch
                    checked={method.enabled}
                    onCheckedChange={() => onToggle(method)}
                    disabled={isToggling}
                  />
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

export function PaymentMethodsSettings() {
  const { methods, isLoading, createMethod, updateMethod, deleteMethod, toggleMethod, reorderMethods } = usePaymentMethods();
  const [editingMethod, setEditingMethod] = useState<EditingMethod | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedSubtypes, setSelectedSubtypes] = useState<PaymentSubtype[]>([]);
  const [addDialogStep, setAddDialogStep] = useState<'country' | 'select' | 'details'>('country');
  const [newMethodData, setNewMethodData] = useState<Partial<EditingMethod>>({
    name: '',
    instructions: '',
    enabled: true,
    bank_select_value: '',
    bank_name: '',
    account_number: '',
    clabe: '',
    account_holder: '',
    card_number: '',
    paypal_email: '',
    paypal_link: '',
    payment_link: '',
    location: '',
    schedule: '',
    custom_label: '',
    custom_identifier: '',
    custom_identifier_label: 'email',
    custom_qr_url: '',
    currency: 'MXN',
    country: 'MX',
  });
  const [deleteConfirmData, setDeleteConfirmData] = useState<{ groupId: string | null; methodIds: string[] } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>();
  
  // Get available countries
  const availableCountries = useMemo(() => getAllCountries(), []);
  
  // Get methods for selected country
  const countryConfig = useMemo(() => 
    selectedCountry ? getCountryConfig(selectedCountry) : null, 
    [selectedCountry]
  );

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

  // Group methods for display
  const groupedMethods = useMemo(() => groupMethodsByAccount(methods), [methods]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = methods.findIndex((m) => m.id === active.id);
      const newIndex = methods.findIndex((m) => m.id === over.id);
      
      const reorderedMethods = arrayMove(methods, oldIndex, newIndex);
      const orderedIds = reorderedMethods.map(m => m.id);
      
      reorderMethods.mutate(orderedIds);
    }
  };

  const handleToggle = (method: PaymentMethod) => {
    toggleMethod.mutate({ id: method.id, enabled: !method.enabled });
  };

  const handleDeleteGroup = () => {
    if (deleteConfirmData) {
      // Delete all methods in the group
      deleteConfirmData.methodIds.forEach(id => {
        deleteMethod.mutate(id);
      });
      setDeleteConfirmData(null);
    }
  };

  // Determine which field categories are needed based on selected subtypes
  const getFieldCategories = (subtypes: PaymentSubtype[]) => {
    const hasBank = subtypes.some(s => s === 'bank_transfer' || s === 'bank_deposit');
    const hasStore = subtypes.some(s => s === 'oxxo' || s === 'pharmacy' || s === 'convenience_store');
    const hasPaypal = subtypes.includes('paypal');
    const hasMercadoPago = subtypes.includes('mercado_pago');
    const hasCash = subtypes.includes('cash_in_person');
    const hasZelle = subtypes.includes('zelle');
    const hasVenmo = subtypes.includes('venmo');
    const hasCashApp = subtypes.includes('cash_app');
    const hasWesternUnion = subtypes.includes('western_union');
    const hasCustom = subtypes.includes('custom');
    const hasDigitalWallet = hasZelle || hasVenmo || hasCashApp;
    return { hasBank, hasStore, hasPaypal, hasMercadoPago, hasCash, hasZelle, hasVenmo, hasCashApp, hasWesternUnion, hasCustom, hasDigitalWallet };
  };

  const validateNewMethodData = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const { hasBank, hasStore, hasPaypal, hasMercadoPago } = getFieldCategories(selectedSubtypes);

    // Bank validations
    if (hasBank || hasStore) {
      // Validate "Otro" bank requires custom name
      if (newMethodData.bank_select_value === 'Otro' && !newMethodData.bank_name?.trim()) {
        errors.bank_name = 'Ingresa el nombre del banco';
      }
      if (newMethodData.clabe && !isValidClabe(newMethodData.clabe)) {
        errors.clabe = 'La CLABE debe tener exactamente 18 dígitos';
      }
      if (newMethodData.card_number && !isValidCardNumber(newMethodData.card_number)) {
        errors.card_number = 'El número de tarjeta debe tener 16 dígitos';
      }
    }

    // PayPal validations
    if (hasPaypal) {
      if (newMethodData.paypal_email && !isValidEmail(newMethodData.paypal_email)) {
        errors.paypal_email = 'Email inválido';
      }
      if (newMethodData.paypal_link && !isValidUrl(newMethodData.paypal_link)) {
        errors.paypal_link = 'URL inválida';
      }
    }

    // Mercado Pago validations
    if (hasMercadoPago) {
      if (newMethodData.payment_link && !isValidUrl(newMethodData.payment_link)) {
        errors.payment_link = 'URL inválida';
      }
    }

    return errors;
  };

  const handleContinueToDetails = () => {
    if (selectedSubtypes.length === 0) return;
    if (methods.length + selectedSubtypes.length > 20) {
      setValidationErrors({ limit: `Solo puedes agregar ${20 - methods.length} método(s) más` });
      return;
    }
    setAddDialogStep('details');
    setValidationErrors({});
  };

  const handleSaveNewMethods = async () => {
    const errors = validateNewMethodData();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Generate a shared group_id for all methods created together
    const groupId = crypto.randomUUID();
    
    // Get the actual bank name to save
    const finalBankName = newMethodData.bank_select_value === 'Otro' 
      ? newMethodData.bank_name 
      : newMethodData.bank_select_value;

    // Create each selected method with shared data and same group_id
    for (const subtype of selectedSubtypes) {
      const methodLabel = getSubtypeLabel(subtype, selectedCountry);
      let type: 'bank_transfer' | 'cash' | 'other' = 'other';
      if (subtype === 'bank_transfer' || subtype === 'bank_deposit' || subtype === 'pix') {
        type = 'bank_transfer';
      } else if (subtype === 'cash_in_person') {
        type = 'cash';
      }
      
      await createMethod.mutateAsync({
        type,
        subtype,
        name: subtype === 'custom' ? (newMethodData.custom_label || 'Método Personalizado') : methodLabel,
        instructions: newMethodData.instructions || null,
        enabled: true,
        display_order: methods.length,
        bank_name: finalBankName || null,
        bank_select_value: newMethodData.bank_select_value || null,
        account_number: newMethodData.account_number || null,
        clabe: newMethodData.clabe?.replace(/\D/g, '') || null,
        account_holder: newMethodData.account_holder || null,
        card_number: newMethodData.card_number?.replace(/\D/g, '') || null,
        paypal_email: newMethodData.paypal_email || null,
        paypal_link: newMethodData.paypal_link || null,
        payment_link: newMethodData.payment_link || null,
        location: newMethodData.location || null,
        schedule: newMethodData.schedule || null,
        group_id: selectedSubtypes.length > 1 ? groupId : null,
        // New custom fields
        custom_label: newMethodData.custom_label || null,
        custom_identifier: newMethodData.custom_identifier || null,
        custom_identifier_label: newMethodData.custom_identifier_label || null,
        custom_qr_url: newMethodData.custom_qr_url || null,
        currency: newMethodData.currency || countryConfig?.currency || 'MXN',
        country: selectedCountry || 'MX',
      } as any);
    }
    
    // Reset dialog state
    setShowAddDialog(false);
    setSelectedCountry('');
    setSelectedSubtypes([]);
    setAddDialogStep('country');
    setNewMethodData({
      name: '',
      instructions: '',
      enabled: true,
      bank_select_value: '',
      bank_name: '',
      account_number: '',
      clabe: '',
      account_holder: '',
      card_number: '',
      paypal_email: '',
      paypal_link: '',
      payment_link: '',
      location: '',
      schedule: '',
      country: 'MX',
      currency: 'MXN',
    });
    setValidationErrors({});
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setSelectedCountry('');
    setSelectedSubtypes([]);
    setAddDialogStep('country');
    setNewMethodData({
      name: '',
      instructions: '',
      enabled: true,
      bank_select_value: '',
      bank_name: '',
      account_number: '',
      clabe: '',
      account_holder: '',
      card_number: '',
      paypal_email: '',
      paypal_link: '',
      payment_link: '',
      location: '',
      schedule: '',
      country: 'MX',
      currency: 'MXN',
    });
    setValidationErrors({});
  };

  const handleSelectCountry = (countryCode: string) => {
    const config = getCountryConfig(countryCode);
    setSelectedCountry(countryCode);
    setNewMethodData(prev => ({
      ...prev,
      country: countryCode,
      currency: config?.currency || 'MXN',
    }));
    setAddDialogStep('select');
  };

  const handleBackToCountry = () => {
    setSelectedSubtypes([]);
    setAddDialogStep('country');
  };

  const toggleSubtypeSelection = (subtype: PaymentSubtype) => {
    setSelectedSubtypes(prev => 
      prev.includes(subtype)
        ? prev.filter(s => s !== subtype)
        : [...prev, subtype]
    );
  };

  const handleEditMethod = (method: PaymentMethod) => {
    const m = method as any;
    const subtype = m.subtype || (method.type === 'bank_transfer' ? 'bank_transfer' : method.type === 'cash' ? 'cash_in_person' : 'paypal');
    
    // Determine if it's a custom bank (not in predefined list)
    const isOtroBank = method.bank_name && !BANK_NAMES.includes(method.bank_name);
    
    setEditingMethod({
      id: method.id,
      subtype: subtype as PaymentSubtype,
      name: method.name,
      instructions: method.instructions || "",
      enabled: method.enabled,
      bank_select_value: isOtroBank ? 'Otro' : (method.bank_name || ''),
      bank_name: isOtroBank ? (method.bank_name || '') : '',
      account_number: method.account_number || "",
      clabe: method.clabe || "",
      account_holder: method.account_holder || "",
      card_number: m.card_number || "",
      paypal_email: m.paypal_email || "",
      paypal_link: m.paypal_link || "",
      payment_link: m.payment_link || "",
      location: m.location || "",
      schedule: m.schedule || "",
      group_id: method.group_id || null,
      // Custom fields
      custom_label: m.custom_label || "",
      custom_identifier: m.custom_identifier || "",
      custom_identifier_label: m.custom_identifier_label || "email",
      custom_qr_url: m.custom_qr_url || "",
      currency: m.currency || "MXN",
      country: m.country || "MX",
    });
    setValidationErrors({});
  };

  // Handle bank selection for editing
  const handleBankSelect = (value: string) => {
    if (value === 'Otro') {
      setEditingMethod(prev => prev ? { 
        ...prev, 
        bank_select_value: 'Otro',
        bank_name: '' 
      } : null);
    } else {
      setEditingMethod(prev => prev ? { 
        ...prev, 
        bank_select_value: value,
        bank_name: '' // Clear custom name when selecting predefined bank
      } : null);
    }
  };

  // Handle bank selection for new method
  const handleNewMethodBankSelect = (value: string) => {
    if (value === 'Otro') {
      setNewMethodData(prev => ({ 
        ...prev, 
        bank_select_value: 'Otro',
        bank_name: '' 
      }));
    } else {
      setNewMethodData(prev => ({ 
        ...prev, 
        bank_select_value: value,
        bank_name: '' // Clear custom name when selecting predefined bank
      }));
    }
  };

  const formatClabe = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 18);
    return digits;
  };

  const validateMethod = (method: EditingMethod): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!method.name.trim()) {
      errors.name = 'El nombre es requerido';
    }

    // Validate "Otro" bank requires custom name
    if (method.bank_select_value === 'Otro' && !method.bank_name?.trim()) {
      errors.bank_name = 'Ingresa el nombre del banco';
    }

    // Bank validations
    if (method.subtype === 'bank_transfer' || method.subtype === 'bank_deposit') {
      if (method.clabe && !isValidClabe(method.clabe)) {
        errors.clabe = 'La CLABE debe tener exactamente 18 dígitos';
      }
      if (method.card_number && !isValidCardNumber(method.card_number)) {
        errors.card_number = 'El número de tarjeta debe tener 16 dígitos';
      }
    }

    // Store validations
    if (method.subtype === 'oxxo' || method.subtype === 'pharmacy' || method.subtype === 'convenience_store') {
      if (method.card_number && !isValidCardNumber(method.card_number)) {
        errors.card_number = 'El número de tarjeta debe tener 16 dígitos';
      }
    }

    // PayPal validations
    if (method.subtype === 'paypal') {
      if (method.paypal_email && !isValidEmail(method.paypal_email)) {
        errors.paypal_email = 'Email inválido';
      }
      if (method.paypal_link && !isValidUrl(method.paypal_link)) {
        errors.paypal_link = 'URL inválida';
      }
    }

    // Mercado Pago validations
    if (method.subtype === 'mercado_pago') {
      if (method.payment_link && !isValidUrl(method.payment_link)) {
        errors.payment_link = 'URL inválida';
      }
    }

    return errors;
  };

  const handleSave = () => {
    if (!editingMethod) return;

    const errors = validateMethod(editingMethod);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Determine type based on subtype
    let type: 'bank_transfer' | 'cash' | 'other' = 'other';
    const subtype = editingMethod.subtype;
    if (subtype === 'bank_transfer' || subtype === 'bank_deposit') {
      type = 'bank_transfer';
    } else if (subtype === 'cash_in_person') {
      type = 'cash';
    }

    // Get the actual bank name to save
    const finalBankName = editingMethod.bank_select_value === 'Otro' 
      ? editingMethod.bank_name 
      : editingMethod.bank_select_value;

    const methodData: any = {
      type,
      subtype: editingMethod.subtype,
      name: editingMethod.name,
      instructions: editingMethod.instructions || null,
      enabled: editingMethod.enabled,
      display_order: methods.length,
      // Bank fields
      bank_name: finalBankName || null,
      bank_select_value: editingMethod.bank_select_value || null,
      account_number: editingMethod.account_number || null,
      clabe: editingMethod.clabe?.replace(/\D/g, '') || null,
      account_holder: editingMethod.account_holder || null,
      card_number: editingMethod.card_number?.replace(/\D/g, '') || null,
      // Digital fields
      paypal_email: editingMethod.paypal_email || null,
      paypal_link: editingMethod.paypal_link || null,
      payment_link: editingMethod.payment_link || null,
      // Cash fields
      location: editingMethod.location || null,
      schedule: editingMethod.schedule || null,
      // Grouping
      group_id: editingMethod.group_id,
    };

    if (editingMethod.id) {
      // If editing, also update all methods in the same group with shared data
      if (editingMethod.group_id) {
        const groupMethods = methods.filter(m => m.group_id === editingMethod.group_id);
        groupMethods.forEach(m => {
          updateMethod.mutate({ 
            id: m.id, 
            updates: {
              bank_name: finalBankName || null,
              bank_select_value: editingMethod.bank_select_value || null,
              account_number: editingMethod.account_number || null,
              clabe: editingMethod.clabe?.replace(/\D/g, '') || null,
              account_holder: editingMethod.account_holder || null,
              card_number: editingMethod.card_number?.replace(/\D/g, '') || null,
              paypal_email: editingMethod.paypal_email || null,
              paypal_link: editingMethod.paypal_link || null,
              payment_link: editingMethod.payment_link || null,
              location: editingMethod.location || null,
              schedule: editingMethod.schedule || null,
              instructions: editingMethod.instructions || null,
            }
          });
        });
      } else {
        updateMethod.mutate({ id: editingMethod.id, updates: methodData });
      }
    } else {
      createMethod.mutate(methodData);
    }
    setEditingMethod(null);
    setValidationErrors({});
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Get bank list for editing (uses country from editing method or fallback)
  const editingBankList = useMemo(() => {
    const country = editingMethod?.country || 'MX';
    return getBankListForCountry(country);
  }, [editingMethod?.country]);

  // Get bank list for new method
  const newMethodBankList = useMemo(() => {
    return getBankListForCountry(selectedCountry || 'MX');
  }, [selectedCountry]);

  const renderDynamicFields = () => {
    if (!editingMethod) return null;

    const { subtype } = editingMethod;
    const isOtroBank = editingMethod.bank_select_value === 'Otro';

    // Bank transfer / deposit fields
    if (subtype === 'bank_transfer' || subtype === 'bank_deposit') {
      return (
        <>
          <div className="space-y-2">
            <Label>Banco</Label>
            <Select 
              value={editingMethod.bank_select_value || ''} 
              onValueChange={handleBankSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un banco">
                  {editingMethod.bank_select_value && editingMethod.bank_select_value !== 'Otro' && (
                    <BankSelectItem bankName={editingMethod.bank_select_value} />
                  )}
                  {editingMethod.bank_select_value === 'Otro' && (
                    <span>Otro banco</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {editingBankList.map(bank => (
                  <SelectItem key={bank} value={bank}>
                    <BankSelectItem bankName={bank} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Show preview for predefined banks */}
            {editingMethod.bank_select_value && editingMethod.bank_select_value !== 'Otro' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-muted-foreground">Vista previa:</span>
                <BankBadge bankName={editingMethod.bank_select_value} size="md" />
              </div>
            )}
            
            {/* Show input for custom bank name when "Otro" is selected */}
            {isOtroBank && (
              <div className="mt-2">
                <Input
                  placeholder="Nombre del banco"
                  value={editingMethod.bank_name}
                  onChange={(e) => setEditingMethod(prev => prev ? { ...prev, bank_name: e.target.value } : null)}
                  className={validationErrors.bank_name ? 'border-destructive' : ''}
                />
                {validationErrors.bank_name && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.bank_name}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>CLABE Interbancaria (18 dígitos)</Label>
            <Input
              value={editingMethod.clabe}
              onChange={(e) => setEditingMethod({ ...editingMethod, clabe: formatClabe(e.target.value) })}
              placeholder="000000000000000000"
              maxLength={18}
              className={validationErrors.clabe ? 'border-destructive' : ''}
            />
            {validationErrors.clabe && (
              <p className="text-xs text-destructive">{validationErrors.clabe}</p>
            )}
            {editingMethod.clabe && (
              <p className="text-xs text-muted-foreground">{editingMethod.clabe.length}/18 dígitos</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Número de Cuenta (opcional)</Label>
              <Input
                value={editingMethod.account_number}
                onChange={(e) => setEditingMethod({ ...editingMethod, account_number: e.target.value })}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Tarjeta de Débito (16 dígitos, opcional)</Label>
              <Input
                value={formatCardNumber(editingMethod.card_number)}
                onChange={(e) => setEditingMethod({ ...editingMethod, card_number: e.target.value.replace(/\D/g, '') })}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                className={validationErrors.card_number ? 'border-destructive' : ''}
              />
              {validationErrors.card_number && (
                <p className="text-xs text-destructive">{validationErrors.card_number}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Titular de la Cuenta</Label>
            <Input
              value={editingMethod.account_holder}
              onChange={(e) => setEditingMethod({ ...editingMethod, account_holder: e.target.value })}
              placeholder="Nombre completo del titular"
            />
          </div>
        </>
      );
    }

    // Store fields (OXXO, pharmacies, convenience stores)
    if (subtype === 'oxxo' || subtype === 'pharmacy' || subtype === 'convenience_store') {
      return (
        <>
          <div className="space-y-2">
            <Label>Número de Tarjeta de Débito (16 dígitos)</Label>
            <Input
              value={formatCardNumber(editingMethod.card_number)}
              onChange={(e) => setEditingMethod({ ...editingMethod, card_number: e.target.value.replace(/\D/g, '') })}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              className={validationErrors.card_number ? 'border-destructive' : ''}
            />
            {validationErrors.card_number && (
              <p className="text-xs text-destructive">{validationErrors.card_number}</p>
            )}
            {editingMethod.card_number && (
              <p className="text-xs text-muted-foreground">{editingMethod.card_number.length}/16 dígitos</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nombre del Titular</Label>
            <Input
              value={editingMethod.account_holder}
              onChange={(e) => setEditingMethod({ ...editingMethod, account_holder: e.target.value })}
              placeholder="Nombre como aparece en la tarjeta"
            />
          </div>

          <div className="space-y-2">
            <Label>Banco de la Tarjeta (opcional)</Label>
            <Select 
              value={editingMethod.bank_select_value || ''} 
              onValueChange={handleBankSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un banco">
                  {editingMethod.bank_select_value && editingMethod.bank_select_value !== 'Otro' && (
                    <BankSelectItem bankName={editingMethod.bank_select_value} />
                  )}
                  {editingMethod.bank_select_value === 'Otro' && (
                    <span>Otro banco</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {editingBankList.map(bank => (
                  <SelectItem key={bank} value={bank}>
                    <BankSelectItem bankName={bank} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {isOtroBank && (
              <div className="mt-2">
                <Input
                  placeholder="Nombre del banco"
                  value={editingMethod.bank_name}
                  onChange={(e) => setEditingMethod(prev => prev ? { ...prev, bank_name: e.target.value } : null)}
                  className={validationErrors.bank_name ? 'border-destructive' : ''}
                />
                {validationErrors.bank_name && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.bank_name}</p>
                )}
              </div>
            )}
          </div>
        </>
      );
    }

    // PayPal fields
    if (subtype === 'paypal') {
      return (
        <>
          <div className="space-y-2">
            <Label>Email de PayPal</Label>
            <Input
              type="email"
              value={editingMethod.paypal_email}
              onChange={(e) => setEditingMethod({ ...editingMethod, paypal_email: e.target.value })}
              placeholder="tu@email.com"
              className={validationErrors.paypal_email ? 'border-destructive' : ''}
            />
            {validationErrors.paypal_email && (
              <p className="text-xs text-destructive">{validationErrors.paypal_email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Link de PayPal.me (opcional)</Label>
            <Input
              value={editingMethod.paypal_link}
              onChange={(e) => setEditingMethod({ ...editingMethod, paypal_link: e.target.value })}
              placeholder="https://paypal.me/tuusuario"
              className={validationErrors.paypal_link ? 'border-destructive' : ''}
            />
            {validationErrors.paypal_link && (
              <p className="text-xs text-destructive">{validationErrors.paypal_link}</p>
            )}
          </div>
        </>
      );
    }

    // Mercado Pago fields
    if (subtype === 'mercado_pago') {
      return (
        <div className="space-y-2">
          <Label>Link de Pago</Label>
          <Input
            value={editingMethod.payment_link}
            onChange={(e) => setEditingMethod({ ...editingMethod, payment_link: e.target.value })}
            placeholder="https://mpago.la/..."
            className={validationErrors.payment_link ? 'border-destructive' : ''}
          />
          {validationErrors.payment_link && (
            <p className="text-xs text-destructive">{validationErrors.payment_link}</p>
          )}
        </div>
      );
    }

    // Cash in person fields
    if (subtype === 'cash_in_person') {
      return (
        <>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Ubicación / Dirección
            </Label>
            <Input
              value={editingMethod.location}
              onChange={(e) => setEditingMethod({ ...editingMethod, location: e.target.value })}
              placeholder="Colonia, Ciudad o Punto de encuentro"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horarios Disponibles
            </Label>
            <Input
              value={editingMethod.schedule}
              onChange={(e) => setEditingMethod({ ...editingMethod, schedule: e.target.value })}
              placeholder="Lunes a Viernes 9am - 6pm"
            />
          </div>
        </>
      );
    }

    // Western Union fields
    if (subtype === 'western_union') {
      return (
        <>
          <div className="space-y-2">
            <Label>Nombre del Receptor</Label>
            <Input
              value={editingMethod.account_holder}
              onChange={(e) => setEditingMethod({ ...editingMethod, account_holder: e.target.value })}
              placeholder="Nombre completo como aparece en identificación"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Ciudad / País
            </Label>
            <Input
              value={editingMethod.location}
              onChange={(e) => setEditingMethod({ ...editingMethod, location: e.target.value })}
              placeholder="Ciudad, País"
            />
          </div>
        </>
      );
    }

    // Zelle, Venmo, Cash App fields
    if (subtype === 'zelle' || subtype === 'venmo' || subtype === 'cash_app') {
      const placeholders: Record<string, string> = {
        zelle: 'tu@email.com o (555) 123-4567',
        venmo: '@usuario',
        cash_app: '$usuario',
      };
      return (
        <>
          <div className="space-y-2">
            <Label>
              {subtype === 'zelle' ? 'Email o Teléfono' : subtype === 'venmo' ? 'Usuario Venmo' : 'Usuario Cash App'}
            </Label>
            <Input
              value={editingMethod.custom_identifier}
              onChange={(e) => setEditingMethod({ ...editingMethod, custom_identifier: e.target.value })}
              placeholder={placeholders[subtype]}
            />
          </div>

          <div className="space-y-2">
            <Label>Nombre del Titular</Label>
            <Input
              value={editingMethod.account_holder}
              onChange={(e) => setEditingMethod({ ...editingMethod, account_holder: e.target.value })}
              placeholder="Nombre que aparece en la cuenta"
            />
          </div>

          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select 
              value={editingMethod.currency || 'USD'} 
              onValueChange={(v) => setEditingMethod({ ...editingMethod, currency: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">🇺🇸 USD - Dólar</SelectItem>
                <SelectItem value="MXN">🇲🇽 MXN - Peso Mexicano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    }

    // Custom method fields
    if (subtype === 'custom') {
      return (
        <>
          <div className="space-y-2">
            <Label>Nombre del Método *</Label>
            <Input
              value={editingMethod.custom_label}
              onChange={(e) => setEditingMethod({ ...editingMethod, custom_label: e.target.value })}
              placeholder="Ej: Bitcoin, Crypto, Nequi, Daviplata..."
              className={validationErrors.custom_label ? 'border-destructive' : ''}
            />
            {validationErrors.custom_label && (
              <p className="text-xs text-destructive">{validationErrors.custom_label}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo de Identificador</Label>
            <Select 
              value={editingMethod.custom_identifier_label || 'email'} 
              onValueChange={(v) => setEditingMethod({ ...editingMethod, custom_identifier_label: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Teléfono</SelectItem>
                <SelectItem value="username">@Usuario</SelectItem>
                <SelectItem value="account">Número de cuenta</SelectItem>
                <SelectItem value="wallet">Dirección de wallet</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor del Identificador *</Label>
            <Input
              value={editingMethod.custom_identifier}
              onChange={(e) => setEditingMethod({ ...editingMethod, custom_identifier: e.target.value })}
              placeholder="tu@email.com, @usuario, 0x123..."
              className={validationErrors.custom_identifier ? 'border-destructive' : ''}
            />
            {validationErrors.custom_identifier && (
              <p className="text-xs text-destructive">{validationErrors.custom_identifier}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select 
              value={editingMethod.currency || 'MXN'} 
              onValueChange={(v) => setEditingMethod({ ...editingMethod, currency: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MXN">🇲🇽 MXN - Peso Mexicano</SelectItem>
                <SelectItem value="USD">🇺🇸 USD - Dólar</SelectItem>
                <SelectItem value="COP">🇨🇴 COP - Peso Colombiano</SelectItem>
                <SelectItem value="ARS">🇦🇷 ARS - Peso Argentino</SelectItem>
                <SelectItem value="CLP">🇨🇱 CLP - Peso Chileno</SelectItem>
                <SelectItem value="PEN">🇵🇪 PEN - Sol Peruano</SelectItem>
                <SelectItem value="BRL">🇧🇷 BRL - Real</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              URL de Código QR (opcional)
            </Label>
            <Input
              value={editingMethod.custom_qr_url}
              onChange={(e) => setEditingMethod({ ...editingMethod, custom_qr_url: e.target.value })}
              placeholder="https://..."
              className={validationErrors.custom_qr_url ? 'border-destructive' : ''}
            />
            {validationErrors.custom_qr_url && (
              <p className="text-xs text-destructive">{validationErrors.custom_qr_url}</p>
            )}
          </div>
        </>
      );
    }

    return null;
  };

  const MAX_METHODS = 20;
  const methodsCount = methods.length;
  const progressPercent = (methodsCount / MAX_METHODS) * 100;
  const enabledCount = methods.filter(m => m.enabled).length;

  return (
    <div className="space-y-6">
      {/* Progress Summary Card */}
      <Card className="border-border/50 shadow-sm bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-full shrink-0 ${enabledCount > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {enabledCount > 0 ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm sm:text-base">
                  {methodsCount}/{MAX_METHODS} métodos
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {groupedMethods.length} cuenta{groupedMethods.length !== 1 ? 's' : ''} • {enabledCount} activo{enabledCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <span className={`text-sm font-medium shrink-0 ${progressPercent >= 80 ? 'text-destructive' : progressPercent >= 50 ? 'text-yellow-600' : 'text-primary'}`}>
              {Math.round(progressPercent)}%
            </span>
          </div>
          <Progress 
            value={progressPercent} 
            className={`h-2 ${progressPercent >= 80 ? '[&>div]:bg-destructive' : progressPercent >= 50 ? '[&>div]:bg-yellow-500' : ''}`} 
          />
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div className="min-w-0">
            <CardTitle className="text-lg">Métodos de Pago</CardTitle>
            <CardDescription className="break-words">
              Configura cómo tus compradores pueden pagarte
            </CardDescription>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)} 
            disabled={methods.length >= 20}
            className="w-full sm:w-auto shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedMethods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes métodos de pago configurados</p>
              <p className="text-sm">Agrega al menos uno para empezar a recibir pagos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedMethods.map((group, index) => (
                <AccountCard
                  key={group.groupId || `ungrouped-${index}`}
                  group={group}
                  onEdit={handleEditMethod}
                  onDelete={(groupId, methodIds) => setDeleteConfirmData({ groupId, methodIds })}
                  onToggle={handleToggle}
                  isToggling={toggleMethod.isPending}
                />
              ))}
            </div>
          )}
          {methods.length >= 20 && (
            <p className="text-sm text-muted-foreground text-center">
              Has alcanzado el límite de 20 métodos de pago
            </p>
          )}
        </CardContent>
      </Card>

      {/* Buyer Preview */}
      <PaymentMethodsPreview methods={methods} />

      {/* Add Method Dialog - Three-Step Flow */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto">
          {addDialogStep === 'country' ? (
            <>
              <DialogHeader>
                <DialogTitle>Crear Cuenta de Pago</DialogTitle>
                <DialogDescription>
                  Paso 1 de 3: ¿En qué país recibirás los pagos?
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-4">
                {availableCountries.map(country => (
                  <button
                    key={country.code}
                    onClick={() => handleSelectCountry(country.code)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5 ${
                      selectedCountry === country.code ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <span className="text-3xl">{country.flag}</span>
                    <span className="font-medium text-sm">{country.name}</span>
                    <span className="text-xs text-muted-foreground">{country.currency}</span>
                  </button>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseAddDialog}>
                  Cancelar
                </Button>
              </DialogFooter>
            </>
          ) : addDialogStep === 'select' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-xl">{countryConfig?.flag}</span>
                  Métodos en {countryConfig?.name}
                </DialogTitle>
                <DialogDescription>
                  Paso 2 de 3: Selecciona los métodos que soporta esta cuenta
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Bank methods */}
                {countryConfig?.methods.bank && countryConfig.methods.bank.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Landmark className="h-4 w-4" /> {CATEGORY_LABELS.bank.label}
                    </h4>
                    <div className="space-y-2">
                      {countryConfig.methods.bank.map(method => {
                        const isSelected = selectedSubtypes.includes(method.id);
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.id}
                            className={`flex items-center gap-4 p-3 w-full rounded-lg border transition-colors ${
                              isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/50"
                            }`}
                            onClick={() => toggleSubtypeSelection(method.id)}
                          >
                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50'}`}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <Icon className="h-5 w-5 shrink-0" />
                            <div className="text-left">
                              <p className="font-medium text-sm">{method.label}</p>
                              {method.description && <p className="text-xs text-muted-foreground">{method.description}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Store methods */}
                {countryConfig?.methods.store && countryConfig.methods.store.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Store className="h-4 w-4" /> {CATEGORY_LABELS.store.label}
                    </h4>
                    <div className="space-y-2">
                      {countryConfig.methods.store.map(method => {
                        const isSelected = selectedSubtypes.includes(method.id);
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.id}
                            className={`flex items-center gap-4 p-3 w-full rounded-lg border transition-colors ${
                              isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/50"
                            }`}
                            onClick={() => toggleSubtypeSelection(method.id)}
                          >
                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50'}`}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <Icon className="h-5 w-5 shrink-0" />
                            <div className="text-left">
                              <p className="font-medium text-sm">{method.label}</p>
                              {method.description && <p className="text-xs text-muted-foreground">{method.description}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Digital methods */}
                {countryConfig?.methods.digital && countryConfig.methods.digital.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Wallet className="h-4 w-4" /> {CATEGORY_LABELS.digital.label}
                    </h4>
                    <div className="space-y-2">
                      {countryConfig.methods.digital.map(method => {
                        const isSelected = selectedSubtypes.includes(method.id);
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.id}
                            className={`flex items-center gap-4 p-3 w-full rounded-lg border transition-colors ${
                              isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/50"
                            }`}
                            onClick={() => toggleSubtypeSelection(method.id)}
                          >
                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50'}`}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <Icon className="h-5 w-5 shrink-0" />
                            <div className="text-left">
                              <p className="font-medium text-sm">{method.label}</p>
                              {method.description && <p className="text-xs text-muted-foreground">{method.description}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cash methods */}
                {countryConfig?.methods.cash && countryConfig.methods.cash.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <HandCoins className="h-4 w-4" /> {CATEGORY_LABELS.cash.label}
                    </h4>
                    <div className="space-y-2">
                      {countryConfig.methods.cash.map(method => {
                        const isSelected = selectedSubtypes.includes(method.id);
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.id}
                            className={`flex items-center gap-4 p-3 w-full rounded-lg border transition-colors ${
                              isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/50"
                            }`}
                            onClick={() => toggleSubtypeSelection(method.id)}
                          >
                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50'}`}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <Icon className="h-5 w-5 shrink-0" />
                            <div className="text-left">
                              <p className="font-medium text-sm">{method.label}</p>
                              {method.description && <p className="text-xs text-muted-foreground">{method.description}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              {validationErrors?.limit && (
                <p className="text-sm text-destructive">{validationErrors.limit}</p>
              )}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="text-sm text-muted-foreground mr-auto">
                  {selectedSubtypes.length > 0 && `${selectedSubtypes.length} seleccionado${selectedSubtypes.length > 1 ? 's' : ''}`}
                </div>
                <Button variant="outline" onClick={handleBackToCountry}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Atrás
                </Button>
                <Button onClick={handleContinueToDetails} disabled={selectedSubtypes.length === 0}>
                  Continuar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Configurar Datos de la Cuenta</DialogTitle>
                <DialogDescription>
                  Paso 3 de 3: Ingresa los datos de tu cuenta en {countryConfig?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Show selected methods summary */}
                <div className="flex flex-wrap gap-2 pb-2 border-b">
                  <span className="text-lg mr-2">{countryConfig?.flag}</span>
                  {selectedSubtypes.map(s => (
                    <span key={s} className="text-xs bg-secondary px-2 py-1 rounded-full flex items-center gap-1">
                      {getIcon(s, selectedCountry)}
                      {getSubtypeLabel(s, selectedCountry)}
                    </span>
                  ))}
                </div>

                {/* Dynamic fields based on selected categories */}
                {(() => {
                  const { hasBank, hasStore, hasPaypal, hasMercadoPago, hasCash, hasDigitalWallet, hasWesternUnion, hasCustom } = getFieldCategories(selectedSubtypes);
                  const isOtroBank = newMethodData.bank_select_value === 'Otro';
                  
                  return (
                    <>
                      {/* Bank fields - shown for bank transfer, deposit, or store methods */}
                      {(hasBank || hasStore) && (
                        <>
                          <div className="space-y-2">
                            <Label>Banco</Label>
                            <Select 
                              value={newMethodData.bank_select_value || ''} 
                              onValueChange={handleNewMethodBankSelect}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un banco">
                                  {newMethodData.bank_select_value && newMethodData.bank_select_value !== 'Otro' && (
                                    <BankSelectItem bankName={newMethodData.bank_select_value} />
                                  )}
                                  {newMethodData.bank_select_value === 'Otro' && (
                                    <span>Otro banco</span>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {newMethodBankList.map(bank => (
                                  <SelectItem key={bank} value={bank}>
                                    <BankSelectItem bankName={bank} />
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            {/* Show preview for predefined banks */}
                            {newMethodData.bank_select_value && newMethodData.bank_select_value !== 'Otro' && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm text-muted-foreground">Vista previa:</span>
                                <BankBadge bankName={newMethodData.bank_select_value} size="md" />
                              </div>
                            )}
                            
                            {/* Show input for custom bank name when "Otro" is selected */}
                            {isOtroBank && (
                              <div className="mt-2">
                                <Input
                                  placeholder="Nombre del banco"
                                  value={newMethodData.bank_name || ''}
                                  onChange={(e) => setNewMethodData(prev => ({ ...prev, bank_name: e.target.value }))}
                                  className={validationErrors.bank_name ? 'border-destructive' : ''}
                                />
                                {validationErrors.bank_name && (
                                  <p className="text-xs text-destructive mt-1">{validationErrors.bank_name}</p>
                                )}
                              </div>
                            )}
                          </div>

                          {hasBank && (
                            <>
                              <div className="space-y-2">
                                <Label>
                                  {countryConfig?.accountFormat.label || 'CLABE Interbancaria'} 
                                  {countryConfig?.accountFormat.length && ` (${countryConfig.accountFormat.length} dígitos)`}
                                </Label>
                                <Input
                                  value={newMethodData.clabe || ''}
                                  onChange={(e) => setNewMethodData(prev => ({ ...prev, clabe: e.target.value.replace(/\D/g, '').slice(0, countryConfig?.accountFormat.length || 18) }))}
                                  placeholder={countryConfig?.accountFormat.placeholder || '000000000000000000'}
                                  maxLength={countryConfig?.accountFormat.length || 18}
                                  className={validationErrors?.clabe ? 'border-destructive' : ''}
                                />
                                {validationErrors?.clabe && (
                                  <p className="text-xs text-destructive">{validationErrors.clabe}</p>
                                )}
                                {newMethodData.clabe && (
                                  <p className="text-xs text-muted-foreground">
                                    {newMethodData.clabe.length}/{countryConfig?.accountFormat.length || 18} dígitos
                                  </p>
                                )}
                              </div>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Número de Cuenta (opcional)</Label>
                                  <Input
                                    value={newMethodData.account_number || ''}
                                    onChange={(e) => setNewMethodData(prev => ({ ...prev, account_number: e.target.value }))}
                                    placeholder="1234567890"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Tarjeta de Débito (16 dígitos, opcional)</Label>
                                  <Input
                                    value={formatCardNumber(newMethodData.card_number || '')}
                                    onChange={(e) => setNewMethodData(prev => ({ ...prev, card_number: e.target.value.replace(/\D/g, '') }))}
                                    placeholder="0000 0000 0000 0000"
                                    maxLength={19}
                                    className={validationErrors.card_number ? 'border-destructive' : ''}
                                  />
                                  {validationErrors.card_number && (
                                    <p className="text-xs text-destructive">{validationErrors.card_number}</p>
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          {hasStore && !hasBank && (
                            <div className="space-y-2">
                              <Label>Número de Tarjeta de Débito (16 dígitos)</Label>
                              <Input
                                value={formatCardNumber(newMethodData.card_number || '')}
                                onChange={(e) => setNewMethodData(prev => ({ ...prev, card_number: e.target.value.replace(/\D/g, '') }))}
                                placeholder="0000 0000 0000 0000"
                                maxLength={19}
                                className={validationErrors.card_number ? 'border-destructive' : ''}
                              />
                              {validationErrors.card_number && (
                                <p className="text-xs text-destructive">{validationErrors.card_number}</p>
                              )}
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Titular de la Cuenta</Label>
                            <Input
                              value={newMethodData.account_holder || ''}
                              onChange={(e) => setNewMethodData(prev => ({ ...prev, account_holder: e.target.value }))}
                              placeholder="Nombre completo del titular"
                            />
                          </div>
                        </>
                      )}

                      {/* PayPal fields */}
                      {hasPaypal && (
                        <>
                          <div className="space-y-2">
                            <Label>Email de PayPal</Label>
                            <Input
                              type="email"
                              value={newMethodData.paypal_email || ''}
                              onChange={(e) => setNewMethodData(prev => ({ ...prev, paypal_email: e.target.value }))}
                              placeholder="tu@email.com"
                              className={validationErrors.paypal_email ? 'border-destructive' : ''}
                            />
                            {validationErrors.paypal_email && (
                              <p className="text-xs text-destructive">{validationErrors.paypal_email}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Link de PayPal.me (opcional)</Label>
                            <Input
                              value={newMethodData.paypal_link || ''}
                              onChange={(e) => setNewMethodData(prev => ({ ...prev, paypal_link: e.target.value }))}
                              placeholder="https://paypal.me/tuusuario"
                              className={validationErrors.paypal_link ? 'border-destructive' : ''}
                            />
                            {validationErrors.paypal_link && (
                              <p className="text-xs text-destructive">{validationErrors.paypal_link}</p>
                            )}
                          </div>
                        </>
                      )}

                      {/* Mercado Pago fields */}
                      {hasMercadoPago && (
                        <div className="space-y-2">
                          <Label>Link de Pago Mercado Pago</Label>
                          <Input
                            value={newMethodData.payment_link || ''}
                            onChange={(e) => setNewMethodData(prev => ({ ...prev, payment_link: e.target.value }))}
                            placeholder="https://mpago.la/..."
                            className={validationErrors.payment_link ? 'border-destructive' : ''}
                          />
                          {validationErrors.payment_link && (
                            <p className="text-xs text-destructive">{validationErrors.payment_link}</p>
                          )}
                        </div>
                      )}

                      {/* Cash in person fields */}
                      {hasCash && (
                        <>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Ubicación / Dirección
                            </Label>
                            <Input
                              value={newMethodData.location || ''}
                              onChange={(e) => setNewMethodData(prev => ({ ...prev, location: e.target.value }))}
                              placeholder="Colonia, Ciudad o Punto de encuentro"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Horarios Disponibles
                            </Label>
                            <Input
                              value={newMethodData.schedule || ''}
                              onChange={(e) => setNewMethodData(prev => ({ ...prev, schedule: e.target.value }))}
                              placeholder="Lunes a Viernes 9am - 6pm"
                            />
                          </div>
                        </>
                      )}

                      {/* Digital wallet fields (Zelle, Venmo, Cash App) */}
                      {hasDigitalWallet && (
                        <>
                          <div className="space-y-2">
                            <Label>Email, Teléfono o Usuario</Label>
                            <Input
                              value={newMethodData.custom_identifier || ''}
                              onChange={(e) => setNewMethodData(prev => ({ ...prev, custom_identifier: e.target.value }))}
                              placeholder="tu@email.com, (555) 123-4567, @usuario"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Nombre del Titular</Label>
                            <Input
                              value={newMethodData.account_holder || ''}
                              onChange={(e) => setNewMethodData(prev => ({ ...prev, account_holder: e.target.value }))}
                              placeholder="Nombre que aparece en la cuenta"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Moneda</Label>
                            <Select 
                              value={newMethodData.currency || 'USD'} 
                              onValueChange={(v) => setNewMethodData(prev => ({ ...prev, currency: v }))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">🇺🇸 USD</SelectItem>
                                <SelectItem value="MXN">🇲🇽 MXN</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {/* Western Union fields */}
                      {hasWesternUnion && (
                        <>
                          <div className="space-y-2">
                            <Label>Nombre del Receptor</Label>
                            <Input
                              value={newMethodData.account_holder || ''}
                              onChange={(e) => setNewMethodData(prev => ({ ...prev, account_holder: e.target.value }))}
                              placeholder="Nombre como aparece en identificación"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ciudad / País</Label>
                            <Input
                              value={newMethodData.location || ''}
                              onChange={(e) => setNewMethodData(prev => ({ ...prev, location: e.target.value }))}
                              placeholder="Ciudad, País"
                            />
                          </div>
                        </>
                      )}

                      {/* Custom method fields */}
                      {hasCustom && (
                        <>
                          <div className="space-y-2">
                            <Label>Nombre del Método *</Label>
                            <Input
                              value={newMethodData.custom_label || ''}
                              onChange={(e) => setNewMethodData(prev => ({ ...prev, custom_label: e.target.value }))}
                              placeholder="Ej: Bitcoin, Nequi, Daviplata..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Identificador (email, teléfono, wallet) *</Label>
                            <Input
                              value={newMethodData.custom_identifier || ''}
                              onChange={(e) => setNewMethodData(prev => ({ ...prev, custom_identifier: e.target.value }))}
                              placeholder="tu@email.com, @usuario, 0x123..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Moneda</Label>
                            <Select 
                              value={newMethodData.currency || 'MXN'} 
                              onValueChange={(v) => setNewMethodData(prev => ({ ...prev, currency: v }))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MXN">🇲🇽 MXN</SelectItem>
                                <SelectItem value="USD">🇺🇸 USD</SelectItem>
                                <SelectItem value="COP">🇨🇴 COP</SelectItem>
                                <SelectItem value="ARS">🇦🇷 ARS</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {/* Instructions for all */}
                      <div className="space-y-2">
                        <Label>Instrucciones Adicionales (opcional)</Label>
                        <Textarea
                          value={newMethodData.instructions || ''}
                          onChange={(e) => setNewMethodData(prev => ({ ...prev, instructions: e.target.value }))}
                          placeholder="Ej: Enviar comprobante por WhatsApp después del pago"
                          rows={2}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setAddDialogStep('select')}>
                  Atrás
                </Button>
                <Button onClick={handleSaveNewMethods} disabled={createMethod.isPending}>
                  {createMethod.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Guardar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Method Dialog */}
      <Dialog open={!!editingMethod} onOpenChange={() => { setEditingMethod(null); setValidationErrors({}); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Método de Pago</DialogTitle>
            <DialogDescription>
              Modifica los datos de {editingMethod?.name}
            </DialogDescription>
          </DialogHeader>
          {editingMethod && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={editingMethod.name}
                  onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                  className={validationErrors.name ? 'border-destructive' : ''}
                />
                {validationErrors.name && (
                  <p className="text-xs text-destructive">{validationErrors.name}</p>
                )}
              </div>

              {renderDynamicFields()}

              <div className="space-y-2">
                <Label>Instrucciones Adicionales (opcional)</Label>
                <Textarea
                  value={editingMethod.instructions}
                  onChange={(e) => setEditingMethod({ ...editingMethod, instructions: e.target.value })}
                  placeholder="Ej: Enviar comprobante por WhatsApp después del pago"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingMethod(null); setValidationErrors({}); }}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateMethod.isPending || createMethod.isPending}>
              {(updateMethod.isPending || createMethod.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmData} onOpenChange={() => setDeleteConfirmData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cuenta de pago?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmData?.methodIds.length === 1 
                ? 'Esta acción eliminará este método de pago. No podrás recuperarlo.'
                : `Esta acción eliminará ${deleteConfirmData?.methodIds.length} métodos de pago asociados a esta cuenta. No podrás recuperarlos.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

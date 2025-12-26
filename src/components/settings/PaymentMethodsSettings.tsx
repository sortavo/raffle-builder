import { useState } from "react";
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
  X,
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
  AlertCircle
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
import { BANK_NAMES, getBankConfig } from "@/lib/bank-config";

// Payment subtypes with categories
const PAYMENT_SUBTYPES = [
  // Bank
  { id: 'bank_deposit', label: 'Depósito en ventanilla', icon: Landmark, category: 'bank', description: 'Depósito directo en sucursal bancaria' },
  { id: 'bank_transfer', label: 'Transferencia SPEI', icon: ArrowRightLeft, category: 'bank', description: 'Transferencia electrónica interbancaria' },
  // Store
  { id: 'oxxo', label: 'OXXO Pay', icon: Store, category: 'store', description: 'Pago en tiendas OXXO' },
  { id: 'pharmacy', label: 'Farmacias', icon: Pill, category: 'store', description: 'Farmacias Guadalajara, del Ahorro, etc.' },
  { id: 'convenience_store', label: '7-Eleven / Otras tiendas', icon: ShoppingBag, category: 'store', description: 'Tiendas de conveniencia' },
  // Digital
  { id: 'paypal', label: 'PayPal', icon: CreditCard, category: 'digital', description: 'Pago con cuenta PayPal' },
  { id: 'mercado_pago', label: 'Mercado Pago', icon: Wallet, category: 'digital', description: 'Link de pago Mercado Pago' },
  // Cash
  { id: 'cash_in_person', label: 'Efectivo en persona', icon: HandCoins, category: 'cash', description: 'Entrega de efectivo en persona' },
] as const;

type PaymentSubtype = typeof PAYMENT_SUBTYPES[number]['id'];

// Mexican banks list (for iteration)
const MEXICAN_BANKS_LIST = [...BANK_NAMES, 'Otro'] as const;

interface EditingMethod {
  id?: string;
  subtype: PaymentSubtype;
  name: string;
  instructions: string;
  enabled: boolean;
  // Bank fields
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
}

const getDefaultEditingMethod = (subtype: PaymentSubtype): EditingMethod => {
  const subtypeInfo = PAYMENT_SUBTYPES.find(s => s.id === subtype);
  return {
    subtype,
    name: subtypeInfo?.label || 'Nuevo método',
    instructions: "",
    enabled: true,
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
  };
};

const getIcon = (subtype: string | null | undefined) => {
  const found = PAYMENT_SUBTYPES.find(s => s.id === subtype);
  if (found) {
    const Icon = found.icon;
    return <Icon className="h-5 w-5" />;
  }
  return <CreditCard className="h-5 w-5" />;
};

const getSubtypeLabel = (subtype: string | null | undefined) => {
  const found = PAYMENT_SUBTYPES.find(s => s.id === subtype);
  return found?.label || 'Método de pago';
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

interface SortableMethodCardProps {
  method: PaymentMethod;
  onEdit: (method: PaymentMethod) => void;
  onDelete: (id: string) => void;
  onToggle: (method: PaymentMethod) => void;
  isToggling: boolean;
}

function SortableMethodCard({ method, onEdit, onDelete, onToggle, isToggling }: SortableMethodCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: method.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const subtype = (method as any).subtype as PaymentSubtype | null;

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`border-border/50 shadow-sm hover:shadow-md transition-all duration-300 ${!method.enabled ? "opacity-60" : ""} ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}`}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div 
          className="flex items-center gap-2 text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </div>
        
        <div className={`p-2 rounded-lg ${method.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {getIcon(subtype || method.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium">{method.name}</h4>
            <span className="text-xs bg-secondary px-2 py-0.5 rounded">
              {getSubtypeLabel(subtype || method.type)}
            </span>
          </div>
          
          {/* Bank info with badge */}
          {(subtype === 'bank_transfer' || subtype === 'bank_deposit' || method.type === 'bank_transfer') && (
            <>
              {method.bank_name && (
                <div className="mt-1">
                  <BankBadge bankName={method.bank_name} size="sm" />
                </div>
              )}
              {method.clabe && (
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  CLABE: {method.clabe}
                </p>
              )}
            </>
          )}

          {/* Card number for deposits */}
          {(method as any).card_number && (
            <p className="text-sm text-muted-foreground font-mono">
              Tarjeta: •••• {(method as any).card_number.slice(-4)}
            </p>
          )}

          {/* PayPal */}
          {(method as any).paypal_email && (
            <p className="text-sm text-muted-foreground">
              {(method as any).paypal_email}
            </p>
          )}

          {/* Payment link */}
          {(method as any).payment_link && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <LinkIcon className="h-3 w-3" /> Link de pago configurado
            </p>
          )}

          {/* Location */}
          {(method as any).location && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {(method as any).location}
            </p>
          )}

          {method.instructions && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {method.instructions}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(method)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(method.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Switch
            checked={method.enabled}
            onCheckedChange={() => onToggle(method)}
            disabled={isToggling}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function PaymentMethodsSettings() {
  const { methods, isLoading, createMethod, updateMethod, deleteMethod, toggleMethod, reorderMethods } = usePaymentMethods();
  const [editingMethod, setEditingMethod] = useState<EditingMethod | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedSubtypes, setSelectedSubtypes] = useState<PaymentSubtype[]>([]);
  const [addDialogStep, setAddDialogStep] = useState<'select' | 'details'>('select');
  const [newMethodData, setNewMethodData] = useState<Partial<EditingMethod>>({
    name: '',
    instructions: '',
    enabled: true,
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
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [customBankName, setCustomBankName] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteMethod.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  // Determine which field categories are needed based on selected subtypes
  const getFieldCategories = (subtypes: PaymentSubtype[]) => {
    const hasBank = subtypes.some(s => s === 'bank_transfer' || s === 'bank_deposit');
    const hasStore = subtypes.some(s => s === 'oxxo' || s === 'pharmacy' || s === 'convenience_store');
    const hasPaypal = subtypes.includes('paypal');
    const hasMercadoPago = subtypes.includes('mercado_pago');
    const hasCash = subtypes.includes('cash_in_person');
    return { hasBank, hasStore, hasPaypal, hasMercadoPago, hasCash };
  };

  const validateNewMethodData = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const { hasBank, hasStore, hasPaypal, hasMercadoPago } = getFieldCategories(selectedSubtypes);

    // Bank validations
    if (hasBank || hasStore) {
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

    // Create each selected method with shared data
    for (const subtype of selectedSubtypes) {
      const subtypeInfo = PAYMENT_SUBTYPES.find(s => s.id === subtype);
      let type: 'bank_transfer' | 'cash' | 'other' = 'other';
      if (subtype === 'bank_transfer' || subtype === 'bank_deposit') {
        type = 'bank_transfer';
      } else if (subtype === 'cash_in_person') {
        type = 'cash';
      }
      
      await createMethod.mutateAsync({
        type,
        subtype,
        name: subtypeInfo?.label || 'Método de pago',
        instructions: newMethodData.instructions || null,
        enabled: true,
        display_order: methods.length,
        bank_name: newMethodData.bank_name || null,
        account_number: newMethodData.account_number || null,
        clabe: newMethodData.clabe?.replace(/\D/g, '') || null,
        account_holder: newMethodData.account_holder || null,
        card_number: newMethodData.card_number?.replace(/\D/g, '') || null,
        paypal_email: newMethodData.paypal_email || null,
        paypal_link: newMethodData.paypal_link || null,
        payment_link: newMethodData.payment_link || null,
        location: newMethodData.location || null,
        schedule: newMethodData.schedule || null,
      });
    }
    
    // Reset dialog state
    setShowAddDialog(false);
    setSelectedSubtypes([]);
    setAddDialogStep('select');
    setNewMethodData({
      name: '',
      instructions: '',
      enabled: true,
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
    });
    setValidationErrors({});
    setCustomBankName('');
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
    setSelectedSubtypes([]);
    setAddDialogStep('select');
    setNewMethodData({
      name: '',
      instructions: '',
      enabled: true,
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
    });
    setValidationErrors({});
    setCustomBankName('');
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
    
    setEditingMethod({
      id: method.id,
      subtype: subtype as PaymentSubtype,
      name: method.name,
      instructions: method.instructions || "",
      enabled: method.enabled,
      bank_name: method.bank_name || "",
      account_number: method.account_number || "",
      clabe: method.clabe || "",
      account_holder: method.account_holder || "",
      card_number: m.card_number || "",
      paypal_email: m.paypal_email || "",
      paypal_link: m.paypal_link || "",
      payment_link: m.payment_link || "",
      location: m.location || "",
      schedule: m.schedule || "",
    });
    setCustomBankName(method.bank_name && !BANK_NAMES.includes(method.bank_name) ? method.bank_name : '');
    setValidationErrors({});
  };

  const handleBankSelect = (value: string) => {
    if (value === 'Otro') {
      setEditingMethod(prev => prev ? { ...prev, bank_name: customBankName } : null);
    } else {
      setEditingMethod(prev => prev ? { ...prev, bank_name: value } : null);
      setCustomBankName('');
    }
  };

  const handleNewMethodBankSelect = (value: string) => {
    if (value === 'Otro') {
      setNewMethodData(prev => ({ ...prev, bank_name: customBankName }));
    } else {
      setNewMethodData(prev => ({ ...prev, bank_name: value }));
      setCustomBankName('');
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

    const methodData: any = {
      type,
      subtype: editingMethod.subtype,
      name: editingMethod.name,
      instructions: editingMethod.instructions || null,
      enabled: editingMethod.enabled,
      display_order: methods.length,
      // Bank fields
      bank_name: editingMethod.bank_name || null,
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
    };

    if (editingMethod.id) {
      updateMethod.mutate({ id: editingMethod.id, updates: methodData });
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

  // Group subtypes by category for the selector
  const subtypesByCategory = {
    bank: PAYMENT_SUBTYPES.filter(s => s.category === 'bank'),
    store: PAYMENT_SUBTYPES.filter(s => s.category === 'store'),
    digital: PAYMENT_SUBTYPES.filter(s => s.category === 'digital'),
    cash: PAYMENT_SUBTYPES.filter(s => s.category === 'cash'),
  };

  const renderDynamicFields = () => {
    if (!editingMethod) return null;

    const { subtype } = editingMethod;

    // Bank transfer / deposit fields
    if (subtype === 'bank_transfer' || subtype === 'bank_deposit') {
      const isOtroBank = editingMethod.bank_name && !BANK_NAMES.includes(editingMethod.bank_name);
      
      return (
        <>
          <div className="space-y-2">
            <Label>Banco</Label>
            <Select 
              value={isOtroBank ? 'Otro' : editingMethod.bank_name || ''} 
              onValueChange={handleBankSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un banco">
                  {editingMethod.bank_name && !isOtroBank && (
                    <BankSelectItem bankName={editingMethod.bank_name} />
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MEXICAN_BANKS_LIST.map(bank => (
                  <SelectItem key={bank} value={bank}>
                    <BankSelectItem bankName={bank} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editingMethod.bank_name && !isOtroBank && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-muted-foreground">Vista previa:</span>
                <BankBadge bankName={editingMethod.bank_name} size="md" />
              </div>
            )}
            {(isOtroBank || (editingMethod.bank_name === '' && customBankName)) && (
              <Input
                placeholder="Nombre del banco"
                value={customBankName}
                onChange={(e) => {
                  setCustomBankName(e.target.value);
                  setEditingMethod(prev => prev ? { ...prev, bank_name: e.target.value } : null);
                }}
                className="mt-2"
              />
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
            <Select value={editingMethod.bank_name || ''} onValueChange={(v) => setEditingMethod({ ...editingMethod, bank_name: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un banco">
                  {editingMethod.bank_name && (
                    <BankSelectItem bankName={editingMethod.bank_name} />
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MEXICAN_BANKS_LIST.map(bank => (
                  <SelectItem key={bank} value={bank}>
                    <BankSelectItem bankName={bank} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${enabledCount > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {enabledCount > 0 ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {methodsCount}/{MAX_METHODS} métodos configurados
                </p>
                <p className="text-sm text-muted-foreground">
                  {enabledCount > 0 
                    ? `${enabledCount} activo${enabledCount > 1 ? 's' : ''}, ${methodsCount - enabledCount} inactivo${methodsCount - enabledCount !== 1 ? 's' : ''}`
                    : 'Agrega al menos un método de pago para recibir pagos'
                  }
                </p>
              </div>
            </div>
            <span className={`text-sm font-medium ${progressPercent >= 80 ? 'text-destructive' : progressPercent >= 50 ? 'text-yellow-600' : 'text-primary'}`}>
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
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Métodos de Pago</CardTitle>
            <CardDescription>
              Configura cómo los compradores pueden pagarte. Arrastra para reordenar.
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)} disabled={methods.length >= 20} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Método
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {methods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes métodos de pago configurados</p>
              <p className="text-sm">Agrega al menos un método para recibir pagos</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={methods.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {methods.map((method) => (
                    <SortableMethodCard
                      key={method.id}
                      method={method}
                      onEdit={handleEditMethod}
                      onDelete={setDeleteConfirmId}
                      onToggle={handleToggle}
                      isToggling={toggleMethod.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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

      {/* Add Method Dialog - Two-Step Flow */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {addDialogStep === 'select' ? (
            <>
              <DialogHeader>
                <DialogTitle>Agregar Métodos de Pago</DialogTitle>
                <DialogDescription>
                  Paso 1 de 2: Selecciona los métodos que deseas agregar
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Bank methods */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Landmark className="h-4 w-4" /> Métodos Bancarios
                  </h4>
                  <div className="space-y-2">
                    {subtypesByCategory.bank.map(subtype => {
                      const isSelected = selectedSubtypes.includes(subtype.id);
                      return (
                        <button
                          key={subtype.id}
                          className={`flex items-center gap-4 p-3 w-full rounded-lg border transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground/50"
                          }`}
                          onClick={() => toggleSubtypeSelection(subtype.id)}
                        >
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50'}`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <subtype.icon className="h-5 w-5 shrink-0" />
                          <div className="text-left">
                            <p className="font-medium text-sm">{subtype.label}</p>
                            <p className="text-xs text-muted-foreground">{subtype.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Store methods */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Store className="h-4 w-4" /> Tiendas y Depósitos
                  </h4>
                  <div className="space-y-2">
                    {subtypesByCategory.store.map(subtype => {
                      const isSelected = selectedSubtypes.includes(subtype.id);
                      return (
                        <button
                          key={subtype.id}
                          className={`flex items-center gap-4 p-3 w-full rounded-lg border transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground/50"
                          }`}
                          onClick={() => toggleSubtypeSelection(subtype.id)}
                        >
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50'}`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <subtype.icon className="h-5 w-5 shrink-0" />
                          <div className="text-left">
                            <p className="font-medium text-sm">{subtype.label}</p>
                            <p className="text-xs text-muted-foreground">{subtype.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Digital methods */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Wallet className="h-4 w-4" /> Pagos Digitales
                  </h4>
                  <div className="space-y-2">
                    {subtypesByCategory.digital.map(subtype => {
                      const isSelected = selectedSubtypes.includes(subtype.id);
                      return (
                        <button
                          key={subtype.id}
                          className={`flex items-center gap-4 p-3 w-full rounded-lg border transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground/50"
                          }`}
                          onClick={() => toggleSubtypeSelection(subtype.id)}
                        >
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50'}`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <subtype.icon className="h-5 w-5 shrink-0" />
                          <div className="text-left">
                            <p className="font-medium text-sm">{subtype.label}</p>
                            <p className="text-xs text-muted-foreground">{subtype.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cash methods */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <HandCoins className="h-4 w-4" /> Efectivo
                  </h4>
                  <div className="space-y-2">
                    {subtypesByCategory.cash.map(subtype => {
                      const isSelected = selectedSubtypes.includes(subtype.id);
                      return (
                        <button
                          key={subtype.id}
                          className={`flex items-center gap-4 p-3 w-full rounded-lg border transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground/50"
                          }`}
                          onClick={() => toggleSubtypeSelection(subtype.id)}
                        >
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50'}`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <subtype.icon className="h-5 w-5 shrink-0" />
                          <div className="text-left">
                            <p className="font-medium text-sm">{subtype.label}</p>
                            <p className="text-xs text-muted-foreground">{subtype.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {validationErrors.limit && (
                <p className="text-sm text-destructive">{validationErrors.limit}</p>
              )}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="text-sm text-muted-foreground mr-auto">
                  {selectedSubtypes.length > 0 && `${selectedSubtypes.length} seleccionado${selectedSubtypes.length > 1 ? 's' : ''}`}
                </div>
                <Button variant="outline" onClick={handleCloseAddDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleContinueToDetails} disabled={selectedSubtypes.length === 0}>
                  Continuar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Configurar Datos de Pago</DialogTitle>
                <DialogDescription>
                  Paso 2 de 2: Ingresa los datos para {selectedSubtypes.length === 1 ? 'el método seleccionado' : `los ${selectedSubtypes.length} métodos seleccionados`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Show selected methods summary */}
                <div className="flex flex-wrap gap-2 pb-2 border-b">
                  {selectedSubtypes.map(s => {
                    const info = PAYMENT_SUBTYPES.find(p => p.id === s);
                    return (
                      <span key={s} className="text-xs bg-secondary px-2 py-1 rounded-full flex items-center gap-1">
                        {info && <info.icon className="h-3 w-3" />}
                        {info?.label}
                      </span>
                    );
                  })}
                </div>

                {/* Dynamic fields based on selected categories */}
                {(() => {
                  const { hasBank, hasStore, hasPaypal, hasMercadoPago, hasCash } = getFieldCategories(selectedSubtypes);
                  const isOtroBank = newMethodData.bank_name && !BANK_NAMES.includes(newMethodData.bank_name);
                  
                  return (
                    <>
                      {/* Bank fields - shown for bank transfer, deposit, or store methods */}
                      {(hasBank || hasStore) && (
                        <>
                          <div className="space-y-2">
                            <Label>Banco</Label>
                            <Select 
                              value={isOtroBank ? 'Otro' : newMethodData.bank_name || ''} 
                              onValueChange={handleNewMethodBankSelect}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un banco">
                                  {newMethodData.bank_name && !isOtroBank && (
                                    <BankSelectItem bankName={newMethodData.bank_name} />
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {MEXICAN_BANKS_LIST.map(bank => (
                                  <SelectItem key={bank} value={bank}>
                                    <BankSelectItem bankName={bank} />
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {newMethodData.bank_name && !isOtroBank && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm text-muted-foreground">Vista previa:</span>
                                <BankBadge bankName={newMethodData.bank_name} size="md" />
                              </div>
                            )}
                            {(isOtroBank || (newMethodData.bank_name === '' && customBankName)) && (
                              <Input
                                placeholder="Nombre del banco"
                                value={customBankName}
                                onChange={(e) => {
                                  setCustomBankName(e.target.value);
                                  setNewMethodData(prev => ({ ...prev, bank_name: e.target.value }));
                                }}
                                className="mt-2"
                              />
                            )}
                          </div>

                          {hasBank && (
                            <>
                              <div className="space-y-2">
                                <Label>CLABE Interbancaria (18 dígitos)</Label>
                                <Input
                                  value={newMethodData.clabe || ''}
                                  onChange={(e) => setNewMethodData(prev => ({ ...prev, clabe: formatClabe(e.target.value) }))}
                                  placeholder="000000000000000000"
                                  maxLength={18}
                                  className={validationErrors.clabe ? 'border-destructive' : ''}
                                />
                                {validationErrors.clabe && (
                                  <p className="text-xs text-destructive">{validationErrors.clabe}</p>
                                )}
                                {newMethodData.clabe && (
                                  <p className="text-xs text-muted-foreground">{newMethodData.clabe.length}/18 dígitos</p>
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
                          <Label>Link de Pago de Mercado Pago</Label>
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

                      {/* Instructions - always shown */}
                      <div className="space-y-2">
                        <Label>Instrucciones para el Comprador (opcional)</Label>
                        <Textarea
                          value={newMethodData.instructions || ''}
                          onChange={(e) => setNewMethodData(prev => ({ ...prev, instructions: e.target.value }))}
                          placeholder="Describe cómo deben realizar el pago..."
                          rows={3}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setAddDialogStep('select')} className="mr-auto">
                  Atrás
                </Button>
                <Button variant="outline" onClick={handleCloseAddDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveNewMethods} disabled={createMethod.isPending}>
                  {createMethod.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Guardar {selectedSubtypes.length > 1 ? `(${selectedSubtypes.length} métodos)` : ''}
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
            <DialogTitle className="flex items-center gap-2">
              {editingMethod && getIcon(editingMethod.subtype)}
              {editingMethod?.id ? "Editar" : "Nuevo"} {editingMethod && getSubtypeLabel(editingMethod.subtype)}
            </DialogTitle>
          </DialogHeader>
          {editingMethod && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre del Método</Label>
                <Input
                  value={editingMethod.name}
                  onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                  placeholder={getSubtypeLabel(editingMethod.subtype)}
                  className={validationErrors.name ? 'border-destructive' : ''}
                />
                {validationErrors.name && (
                  <p className="text-xs text-destructive">{validationErrors.name}</p>
                )}
              </div>

              {/* Dynamic fields based on subtype */}
              {renderDynamicFields()}

              <div className="space-y-2">
                <Label>Instrucciones para el Comprador</Label>
                <Textarea
                  value={editingMethod.instructions}
                  onChange={(e) => setEditingMethod({ ...editingMethod, instructions: e.target.value })}
                  placeholder="Describe cómo deben realizar el pago..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingMethod(null); setValidationErrors({}); }}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={createMethod.isPending || updateMethod.isPending || !editingMethod?.name}
            >
              {(createMethod.isPending || updateMethod.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar método de pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los compradores ya no verán este método de pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMethod.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentMethods, PaymentMethod } from "@/hooks/usePaymentMethods";
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
  Loader2
} from "lucide-react";
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

type PaymentMethodType = "bank_transfer" | "cash" | "other";

interface EditingMethod {
  id?: string;
  type: PaymentMethodType;
  name: string;
  instructions: string;
  enabled: boolean;
  bank_name: string;
  account_number: string;
  clabe: string;
  account_holder: string;
}

const getDefaultEditingMethod = (type: PaymentMethodType): EditingMethod => ({
  type,
  name: type === "bank_transfer" 
    ? "Nueva cuenta bancaria" 
    : type === "cash" 
    ? "Nuevo método de efectivo"
    : "Otro método",
  instructions: "",
  enabled: true,
  bank_name: "",
  account_number: "",
  clabe: "",
  account_holder: "",
});

export function PaymentMethodsSettings() {
  const { methods, isLoading, createMethod, updateMethod, deleteMethod, toggleMethod } = usePaymentMethods();
  const [editingMethod, setEditingMethod] = useState<EditingMethod | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMethodType, setNewMethodType] = useState<PaymentMethodType>("bank_transfer");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleToggle = (method: PaymentMethod) => {
    toggleMethod.mutate({ id: method.id, enabled: !method.enabled });
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteMethod.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleSave = () => {
    if (!editingMethod) return;

    const methodData = {
      type: editingMethod.type,
      name: editingMethod.name,
      instructions: editingMethod.instructions || null,
      enabled: editingMethod.enabled,
      bank_name: editingMethod.type === "bank_transfer" ? (editingMethod.bank_name || null) : null,
      account_number: editingMethod.type === "bank_transfer" ? (editingMethod.account_number || null) : null,
      clabe: editingMethod.type === "bank_transfer" ? (editingMethod.clabe || null) : null,
      account_holder: editingMethod.type === "bank_transfer" ? (editingMethod.account_holder || null) : null,
      display_order: methods.length,
    };

    if (editingMethod.id) {
      updateMethod.mutate({ id: editingMethod.id, updates: methodData });
    } else {
      createMethod.mutate(methodData);
    }
    setEditingMethod(null);
  };

  const handleAddMethod = () => {
    setShowAddDialog(false);
    setEditingMethod(getDefaultEditingMethod(newMethodType));
  };

  const handleEditMethod = (method: PaymentMethod) => {
    setEditingMethod({
      id: method.id,
      type: method.type as PaymentMethodType,
      name: method.name,
      instructions: method.instructions || "",
      enabled: method.enabled,
      bank_name: method.bank_name || "",
      account_number: method.account_number || "",
      clabe: method.clabe || "",
      account_holder: method.account_holder || "",
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "bank_transfer":
        return <Landmark className="h-5 w-5" />;
      case "cash":
        return <Wallet className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Métodos de Pago</CardTitle>
            <CardDescription>
              Configura cómo los compradores pueden pagarte. Estos datos aparecerán en la página de instrucciones de pago.
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)} disabled={methods.length >= 10}>
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
            methods.map((method) => (
              <Card key={method.id} className={!method.enabled ? "opacity-60" : ""}>
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground cursor-grab">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  
                  <div className={`p-2 rounded-lg ${method.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {getIcon(method.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{method.name}</h4>
                      {method.type === "bank_transfer" && method.bank_name && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                          {method.bank_name}
                        </span>
                      )}
                    </div>
                    {method.type === "bank_transfer" && method.clabe && (
                      <p className="text-sm text-muted-foreground font-mono mt-1">
                        CLABE: {method.clabe}
                      </p>
                    )}
                    {method.type === "bank_transfer" && method.account_holder && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Titular: {method.account_holder}
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
                      onClick={() => handleEditMethod(method)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(method.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={method.enabled}
                      onCheckedChange={() => handleToggle(method)}
                      disabled={toggleMethod.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {methods.length >= 10 && (
            <p className="text-sm text-muted-foreground text-center">
              Has alcanzado el límite de 10 métodos de pago
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Method Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Método de Pago</DialogTitle>
            <DialogDescription>
              Selecciona el tipo de método que deseas agregar
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <button
              className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                newMethodType === "bank_transfer"
                  ? "border-primary bg-primary/5"
                  : "hover:border-muted-foreground/50"
              }`}
              onClick={() => setNewMethodType("bank_transfer")}
            >
              <Landmark className="h-6 w-6" />
              <div className="text-left">
                <p className="font-medium">Transferencia Bancaria</p>
                <p className="text-sm text-muted-foreground">
                  CLABE, cuenta bancaria
                </p>
              </div>
            </button>
            <button
              className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                newMethodType === "cash"
                  ? "border-primary bg-primary/5"
                  : "hover:border-muted-foreground/50"
              }`}
              onClick={() => setNewMethodType("cash")}
            >
              <Wallet className="h-6 w-6" />
              <div className="text-left">
                <p className="font-medium">Efectivo</p>
                <p className="text-sm text-muted-foreground">
                  OXXO, depósito en efectivo
                </p>
              </div>
            </button>
            <button
              className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                newMethodType === "other"
                  ? "border-primary bg-primary/5"
                  : "hover:border-muted-foreground/50"
              }`}
              onClick={() => setNewMethodType("other")}
            >
              <CreditCard className="h-6 w-6" />
              <div className="text-left">
                <p className="font-medium">Otro</p>
                <p className="text-sm text-muted-foreground">
                  PayPal, Mercado Pago, etc.
                </p>
              </div>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMethod}>
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Method Dialog */}
      <Dialog open={!!editingMethod} onOpenChange={() => setEditingMethod(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMethod?.id ? "Editar" : "Nuevo"} Método de Pago
            </DialogTitle>
          </DialogHeader>
          {editingMethod && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre del Método</Label>
                <Input
                  value={editingMethod.name}
                  onChange={(e) =>
                    setEditingMethod({ ...editingMethod, name: e.target.value })
                  }
                  placeholder="Ej: Transferencia BBVA"
                />
              </div>

              {editingMethod.type === "bank_transfer" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <Input
                        value={editingMethod.bank_name}
                        onChange={(e) =>
                          setEditingMethod({
                            ...editingMethod,
                            bank_name: e.target.value,
                          })
                        }
                        placeholder="BBVA, Santander, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número de Cuenta</Label>
                      <Input
                        value={editingMethod.account_number}
                        onChange={(e) =>
                          setEditingMethod({
                            ...editingMethod,
                            account_number: e.target.value,
                          })
                        }
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>CLABE Interbancaria</Label>
                    <Input
                      value={editingMethod.clabe}
                      onChange={(e) =>
                        setEditingMethod({
                          ...editingMethod,
                          clabe: e.target.value,
                        })
                      }
                      placeholder="18 dígitos"
                      maxLength={18}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Titular de la Cuenta</Label>
                    <Input
                      value={editingMethod.account_holder}
                      onChange={(e) =>
                        setEditingMethod({
                          ...editingMethod,
                          account_holder: e.target.value,
                        })
                      }
                      placeholder="Nombre del titular"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Instrucciones para el Comprador</Label>
                <Textarea
                  value={editingMethod.instructions}
                  onChange={(e) =>
                    setEditingMethod({
                      ...editingMethod,
                      instructions: e.target.value,
                    })
                  }
                  placeholder="Describe cómo deben realizar el pago..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMethod(null)}>
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

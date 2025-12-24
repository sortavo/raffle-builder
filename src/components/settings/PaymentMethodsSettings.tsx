import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  CreditCard, 
  Landmark, 
  Wallet, 
  Plus,
  Trash2,
  GripVertical,
  Edit2,
  Check,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PaymentMethod {
  id: string;
  type: "bank_transfer" | "cash" | "other";
  name: string;
  instructions: string;
  enabled: boolean;
  bankName?: string;
  accountNumber?: string;
  clabe?: string;
  accountHolder?: string;
}

const DEFAULT_METHODS: PaymentMethod[] = [
  {
    id: "1",
    type: "bank_transfer",
    name: "Transferencia Bancaria",
    instructions: "Realiza tu transferencia y envía el comprobante",
    enabled: true,
    bankName: "BBVA",
    accountNumber: "1234567890",
    clabe: "012345678901234567",
    accountHolder: "Mi Organización S.A. de C.V.",
  },
  {
    id: "2",
    type: "cash",
    name: "Depósito en OXXO",
    instructions: "Deposita en cualquier OXXO y envía tu ticket",
    enabled: false,
  },
];

export function PaymentMethodsSettings() {
  const [methods, setMethods] = useState<PaymentMethod[]>(DEFAULT_METHODS);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMethodType, setNewMethodType] = useState<"bank_transfer" | "cash" | "other">("bank_transfer");

  const handleToggle = (id: string) => {
    setMethods((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      )
    );
    toast.success("Método de pago actualizado");
  };

  const handleDelete = (id: string) => {
    setMethods((prev) => prev.filter((m) => m.id !== id));
    toast.success("Método de pago eliminado");
  };

  const handleSave = () => {
    if (!editingMethod) return;
    setMethods((prev) =>
      prev.map((m) => (m.id === editingMethod.id ? editingMethod : m))
    );
    setEditingMethod(null);
    toast.success("Método de pago guardado");
  };

  const handleAddMethod = () => {
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: newMethodType,
      name: newMethodType === "bank_transfer" 
        ? "Nueva cuenta bancaria" 
        : newMethodType === "cash" 
        ? "Nuevo método de efectivo"
        : "Otro método",
      instructions: "",
      enabled: true,
    };
    setMethods((prev) => [...prev, newMethod]);
    setShowAddDialog(false);
    setEditingMethod(newMethod);
    toast.success("Método de pago agregado");
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Métodos de Pago</CardTitle>
            <CardDescription>
              Configura cómo los compradores pueden pagarte
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
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
                      {method.type === "bank_transfer" && method.bankName && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                          {method.bankName}
                        </span>
                      )}
                    </div>
                    {method.type === "bank_transfer" && method.clabe && (
                      <p className="text-sm text-muted-foreground font-mono mt-1">
                        CLABE: {method.clabe}
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
                      onClick={() => setEditingMethod(method)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(method.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={method.enabled}
                      onCheckedChange={() => handleToggle(method.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
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
            <DialogTitle>Editar Método de Pago</DialogTitle>
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
                        value={editingMethod.bankName || ""}
                        onChange={(e) =>
                          setEditingMethod({
                            ...editingMethod,
                            bankName: e.target.value,
                          })
                        }
                        placeholder="BBVA, Santander, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número de Cuenta</Label>
                      <Input
                        value={editingMethod.accountNumber || ""}
                        onChange={(e) =>
                          setEditingMethod({
                            ...editingMethod,
                            accountNumber: e.target.value,
                          })
                        }
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>CLABE Interbancaria</Label>
                    <Input
                      value={editingMethod.clabe || ""}
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
                      value={editingMethod.accountHolder || ""}
                      onChange={(e) =>
                        setEditingMethod({
                          ...editingMethod,
                          accountHolder: e.target.value,
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
            <Button onClick={handleSave}>
              <Check className="mr-2 h-4 w-4" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

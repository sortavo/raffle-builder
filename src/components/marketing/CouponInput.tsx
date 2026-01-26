import { useState } from 'react';
import { X, CheckCircle2, Tag, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCoupons, Coupon } from '@/hooks/useCoupons';

interface CouponInputProps {
  raffleId: string;
  subtotal: number;
  onCouponApplied: (coupon: Coupon | null, discount: number) => void;
  currencyCode?: string;
}

export function CouponInput({ 
  raffleId, 
  subtotal, 
  onCouponApplied,
  currencyCode = 'MXN'
}: CouponInputProps) {
  const { validateCoupon, calculateDiscount } = useCoupons();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    if (!couponCode.trim()) return;

    setCouponError('');
    setIsValidating(true);

    try {
      const result = await validateCoupon(couponCode, raffleId, subtotal);
      
      if (result.valid && result.coupon) {
        const discount = calculateDiscount(result.coupon, subtotal);
        setAppliedCoupon(result.coupon);
        onCouponApplied(result.coupon, discount);
      } else {
        setCouponError(result.error || 'Cupón no válido');
        onCouponApplied(null, 0);
      }
    } catch (error) {
      setCouponError('Error al validar cupón');
      onCouponApplied(null, 0);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    onCouponApplied(null, 0);
  };

  const getDiscountText = () => {
    if (!appliedCoupon) return '';
    
    if (appliedCoupon.discount_type === 'percentage') {
      return `${appliedCoupon.discount_value}% de descuento`;
    }
    return `$${appliedCoupon.discount_value} de descuento`;
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Tag className="w-4 h-4" />
        ¿Tienes un cupón de descuento?
      </Label>
      
      <div className="flex gap-2">
        <Input
          placeholder="Ingresa tu código"
          value={couponCode}
          onChange={(e) => {
            setCouponCode(e.target.value.toUpperCase());
            if (couponError) setCouponError('');
          }}
          disabled={!!appliedCoupon}
          className="font-mono uppercase"
          onKeyDown={(e) => e.key === 'Enter' && !appliedCoupon && handleValidate()}
        />
        {appliedCoupon ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleValidate}
            disabled={!couponCode.trim() || isValidating}
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Aplicar'
            )}
          </Button>
        )}
      </div>

      {couponError && (
        <p className="text-sm text-destructive">{couponError}</p>
      )}

      {appliedCoupon && (
        <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            Cupón <strong>"{appliedCoupon.code}"</strong> aplicado: {getDiscountText()}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

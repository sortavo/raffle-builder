import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Copy, Send, Users, CheckCircle2, Gift, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { useReferrals } from '@/hooks/useReferrals';
import { useAuth } from '@/hooks/useAuth';
import { successToast } from '@/lib/toast-helpers';

export function ReferralProgram() {
  const { user, profile } = useAuth();
  const { referrals, isLoading, sendReferralInvite, getReferralLink, stats } = useReferrals();
  const [email, setEmail] = useState('');

  const referralLink = getReferralLink();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    successToast('Enlace copiado al portapapeles');
  };

  const handleSendInvite = async () => {
    if (!email.trim()) return;
    await sendReferralInvite.mutateAsync({
      email: email.trim(),
      referrerName: profile?.full_name || user?.email || 'Un amigo'
    });
    setEmail('');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Te invito a participar en sorteos increíbles',
          text: '¡Únete y obtén un descuento especial en tu primera compra!',
          url: referralLink
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'completed':
        return <Badge variant="default">Registrado</Badge>;
      case 'rewarded':
        return <Badge className="bg-green-500">Recompensado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Programa de Referidos
          </CardTitle>
          <CardDescription>
            Invita amigos y gana 20% de descuento por cada uno que se registre y compre boletos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg border">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Invitados</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-primary">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Registrados</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <p className="text-2xl font-bold text-green-500">{stats.rewarded}</p>
              <p className="text-sm text-muted-foreground">Recompensas</p>
            </div>
          </div>

          {/* Referral Link */}
          <div className="space-y-2">
            <Label>Tu enlace de referido</Label>
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="font-mono text-sm bg-background"
              />
              <Button variant="outline" onClick={handleCopyLink}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Send Invite */}
          <div className="space-y-2">
            <Label>Invitar por email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="amigo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
              />
              <LoadingButton
                onClick={handleSendInvite}
                isLoading={sendReferralInvite.isPending}
                disabled={!email.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </LoadingButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Comparte tu enlace</p>
                <p className="text-sm text-muted-foreground">
                  Envía tu enlace único a amigos y familiares
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Se registran</p>
                <p className="text-sm text-muted-foreground">
                  Cuando se registren usando tu enlace
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Ganas descuento</p>
                <p className="text-sm text-muted-foreground">
                  Recibes 20% de descuento en tu próxima compra
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral List */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Tus Invitaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{referral.referred_email}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(referral.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {referral.reward_value && (
                      <span className="text-sm text-muted-foreground">
                        {referral.reward_value}% descuento
                      </span>
                    )}
                    {getStatusBadge(referral.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

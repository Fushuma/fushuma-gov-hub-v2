'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccount } from 'wagmi';
import { useCreateICO, type ICOFormData } from '@/hooks/launchpad/useCreateICO';
import { getTokenDecimals } from '@/lib/launchpad/tokens';
import { PAYMENT_TOKENS } from '@/lib/launchpad/contracts';
import { toast } from 'sonner';
import { ChevronLeft, Loader2, Rocket, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CreateICOPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { createICO, creationFee, isPending } = useCreateICO();

  const now = new Date();
  const inOneHour = new Date(now.getTime() + 3600 * 1000).toISOString().slice(0, 16);

  const [formData, setFormData] = useState<ICOFormData>({
    tokenAddress: '',
    paymentToken: PAYMENT_TOKENS.FUMA,
    amount: '',
    bonusReserve: '0',
    startPrice: '0.01',
    endPrice: '0',
    startDate: inOneHour,
    endDate: '',
    bonusPercentage: 2500,
    bonusActivator: 1000,
    unlockPercentage: 5000,
    cliffPeriod: 60,
    vestingPercentage: 1000,
    vestingInterval: 60,
  });

  const [customPaymentToken, setCustomPaymentToken] = useState('');

  const handleInputChange = (field: keyof ICOFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentTokenChange = (value: string) => {
    if (value === 'custom') {
      setFormData((prev) => ({ ...prev, paymentToken: customPaymentToken }));
    } else {
      setFormData((prev) => ({ ...prev, paymentToken: value }));
    }
  };

  const validateForm = (): string | null => {
    const now = Date.now();
    const start = new Date(formData.startDate).getTime();
    const end = formData.endDate ? new Date(formData.endDate).getTime() : 0;

    if (!formData.tokenAddress || !formData.tokenAddress.startsWith('0x')) {
      return 'Please enter a valid token address';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return 'Please enter a valid amount to sell';
    }

    if (!formData.startDate) {
      return 'Start date is required';
    }

    if (start < now - 60 * 1000) {
      return 'Start date must be in the future';
    }

    if (formData.endDate && start >= end) {
      return 'End date must be after start date';
    }

    if (parseFloat(formData.startPrice) <= 0) {
      return 'Start price must be greater than 0';
    }

    if (formData.vestingPercentage < 100 || formData.vestingPercentage > 10000) {
      return 'Vesting percentage must be between 1% and 100%';
    }

    if (formData.cliffPeriod < 60) {
      return 'Cliff period must be at least 60 seconds';
    }

    if (formData.vestingInterval < 60) {
      return 'Vesting interval must be at least 60 seconds';
    }

    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      const tokenDecimals = await getTokenDecimals(formData.tokenAddress);
      const paymentDecimals = formData.paymentToken === PAYMENT_TOKENS.FUMA 
        ? 18 
        : await getTokenDecimals(formData.paymentToken);

      await createICO(formData, tokenDecimals, paymentDecimals);
      toast.success('ICO created successfully!');
      router.push('/launchpad');
    } catch (error: any) {
      console.error('Failed to create ICO:', error);
      toast.error(error.message || 'Failed to create ICO');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">
                Please connect your wallet to create an ICO
              </p>
              <Button onClick={() => router.push('/launchpad')}>
                Back to Launchpad
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/launchpad')}
          className="mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Launchpad
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Rocket className="h-8 w-8" />
              Create ICO
            </CardTitle>
            <CardDescription>
              Launch your token sale on Fushuma Network
              {creationFee ? (
                <span className="ml-2 font-semibold">
                  {' '}(Creation fee: {Number(creationFee) / 1e18} FUMA)
                </span>
              ) : null}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Make sure you have approved the launchpad contract to spend your tokens before creating the ICO.
              </AlertDescription>
            </Alert>

            {/* Token Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Token Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tokenAddress">Token Address *</Label>
                  <Input
                    id="tokenAddress"
                    placeholder="0x..."
                    value={formData.tokenAddress}
                    onChange={(e) => handleInputChange('tokenAddress', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentToken">Payment Token *</Label>
                  <Select
                    value={formData.paymentToken === customPaymentToken ? 'custom' : formData.paymentToken}
                    onValueChange={handlePaymentTokenChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PAYMENT_TOKENS.FUMA}>FUMA (Native)</SelectItem>
                      <SelectItem value={PAYMENT_TOKENS.USDC}>USDC</SelectItem>
                      <SelectItem value={PAYMENT_TOKENS.USDT}>USDT</SelectItem>
                      <SelectItem value="custom">Custom Address</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.paymentToken === customPaymentToken && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="customPaymentToken">Custom Payment Token Address</Label>
                    <Input
                      id="customPaymentToken"
                      placeholder="0x..."
                      value={customPaymentToken}
                      onChange={(e) => {
                        setCustomPaymentToken(e.target.value);
                        handleInputChange('paymentToken', e.target.value);
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to Sell *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="e.g., 1000000"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonusReserve">Bonus Reserve</Label>
                  <Input
                    id="bonusReserve"
                    type="number"
                    placeholder="e.g., 100000"
                    value={formData.bonusReserve}
                    onChange={(e) => handleInputChange('bonusReserve', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pricing</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startPrice">Start Price *</Label>
                  <Input
                    id="startPrice"
                    type="number"
                    step="0.000001"
                    placeholder="e.g., 0.01"
                    value={formData.startPrice}
                    onChange={(e) => handleInputChange('startPrice', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endPrice">End Price (0 for fixed)</Label>
                  <Input
                    id="endPrice"
                    type="number"
                    step="0.000001"
                    placeholder="e.g., 0 for fixed price"
                    value={formData.endPrice}
                    onChange={(e) => handleInputChange('endPrice', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Timing</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (optional)</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for unlimited</p>
                </div>
              </div>
            </div>

            {/* Bonus */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Bonus Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bonusPercentage">Bonus Percentage (e.g., 2500 = 25%)</Label>
                  <Input
                    id="bonusPercentage"
                    type="number"
                    value={formData.bonusPercentage}
                    onChange={(e) => handleInputChange('bonusPercentage', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonusActivator">Bonus Activator (e.g., 1000 = 10%)</Label>
                  <Input
                    id="bonusActivator"
                    type="number"
                    value={formData.bonusActivator}
                    onChange={(e) => handleInputChange('bonusActivator', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Vesting */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vesting Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unlockPercentage">Unlock Percentage (e.g., 5000 = 50%)</Label>
                  <Input
                    id="unlockPercentage"
                    type="number"
                    min="0"
                    max="10000"
                    value={formData.unlockPercentage}
                    onChange={(e) => handleInputChange('unlockPercentage', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cliffPeriod">Cliff Period (seconds)</Label>
                  <Input
                    id="cliffPeriod"
                    type="number"
                    min="60"
                    value={formData.cliffPeriod}
                    onChange={(e) => handleInputChange('cliffPeriod', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vestingPercentage">Vesting Percentage (e.g., 1000 = 10%)</Label>
                  <Input
                    id="vestingPercentage"
                    type="number"
                    min="100"
                    max="10000"
                    value={formData.vestingPercentage}
                    onChange={(e) => handleInputChange('vestingPercentage', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vestingInterval">Vesting Interval (seconds)</Label>
                  <Input
                    id="vestingInterval"
                    type="number"
                    min="60"
                    value={formData.vestingInterval}
                    onChange={(e) => handleInputChange('vestingInterval', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full"
              size="lg"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Creating ICO...' : 'Create ICO'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

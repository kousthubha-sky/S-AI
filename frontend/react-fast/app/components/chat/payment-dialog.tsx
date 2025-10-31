// components/payment-dialog.tsx
declare global {
  interface Window {
    Razorpay: any;
  }
}

import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Label } from '~/components/ui/label';
import { useAuthApi } from '~/hooks/useAuthApi';

interface PaymentDialogProps {
  onClose: () => void;
  onSuccess: () => void;
  showLimitReachedMessage?: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  description: string;
}

// Map to Razorpay plan IDs from environment variables
const PLANS: Plan[] = [
  {
    id: 'plan_RXO8u03kq5VmFN', // RAZORPAY_PREMIUM_PLAN_ID
    name: 'Student Pro Pack',
    price: 249,
    features: [
      'Unlimited messages per day',
      'All Free Models +',
      'Pro Models:',
      'x-ai/grok-4-fast',
      'google/gemini-2.5-flash-image',
      'meta-llama/llama-3.3-70b-instruct',
      'Priority support',
      'Advanced document processing',
      'Custom prompts',
      'Image generation(nano-banana)',
      'Advanced analytics',
      'multimodal inputs',
      'Code generation'
      
    ],
    description: 'Great for power users'
  },
 
];

export function PaymentDialog({ onClose, onSuccess, showLimitReachedMessage }: PaymentDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('premium');
  const [isLoading, setIsLoading] = useState(false);
  const { fetchWithAuth } = useAuthApi();

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSubscription = async () => {
    try {
      setIsLoading(true);
      
      // Create subscription via your backend
      const subscriptionResponse = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/subscription/create`, {
        method: 'POST',
        body: JSON.stringify({
          plan_type: selectedPlan, // This is already the Razorpay plan ID
          total_count: 12, // 12 months
          user_id: "" // This will be set by the backend from the token
        })
      });

      console.log('Subscription created:', subscriptionResponse);

      // Initialize Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use environment variable
        subscription_id: subscriptionResponse.razorpay_subscription_id,
        name: 'AI Chat Subscription',
        description: `${PLANS.find(p => p.id === selectedPlan)?.name} Plan - Monthly Subscription`,
        handler: async (response: any) => {
          console.log('Razorpay response:', response);
          
          try {
            // Verify subscription payment
            const verifyResponse = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/subscription/verify`, {
              method: 'POST',
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            console.log('Verification response:', verifyResponse);

            if (verifyResponse.status === 'success') {
              onSuccess();
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Verification error:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          // You can prefill customer details if available
          name: '', // Add user name if available
          email: '', // Add user email if available
        },
        theme: {
          color: '#0066FF'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal dismissed');
            setIsLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      
      rzp.on('payment.failed', function(response: any) {
        console.error('Payment failed:', response.error);
        alert(`Payment failed: ${response.error.description}`);
        setIsLoading(false);
      });

    } catch (error: any) {
      console.error('Subscription initiation failed:', error);
      alert(`Failed to create subscription: ${error.detail || 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const selectedPlanData = PLANS.find(plan => plan.id === selectedPlan);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[500px] max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Choose Your Plan</h2>
            {showLimitReachedMessage && (
              <p className="text-sm text-muted-foreground mt-2">
                You've reached your daily limit of 25 messages. Upgrade to Pro for unlimited messages!
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
        </div>
        
        <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="space-y-3">
          {PLANS.map((plan) => (
            <div key={plan.id} className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value={plan.id} id={plan.id} />
              <Label htmlFor={plan.id} className="flex-1 cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">₹{plan.price}</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {selectedPlanData && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Selected plan</p>
                <p className="font-semibold">{selectedPlanData.name} - ₹{selectedPlanData.price}/month</p>
              </div>
              <Button onClick={handleSubscription} disabled={isLoading} size="lg">
                {isLoading ? 'Processing...' : 'Subscribe Now'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Razorpay to complete your subscription
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
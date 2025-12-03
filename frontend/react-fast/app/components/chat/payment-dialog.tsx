// frontend/react-fast/app/components/chat/payment-dialog.tsx - MULTI-TIER VERSION

declare global {
  interface Window {
    Razorpay: any;
  }
}

import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { useAuthApi } from '~/hooks/useAuthApi';
import { RefreshCw, CheckCircle2, Sparkles, Shield, Brain, X, Crown, Zap, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from "~/components/ui/toast";

interface PaymentDialogProps {
  onClose: () => void;
  onSuccess: () => void;
  showLimitReachedMessage?: boolean;
  userTier?: 'free' | 'starter' | 'pro' | 'pro_plus';
}

const PLANS = {
  starter: {
    id: 'plan_RWzEUovz8FVbX4',  // Student Starter Pack
    name: 'Student Starter',
    price: 199,
    originalPrice: 249,
    description: 'Perfect for students',
    features: [
      '500 messages per month',
      '500K token limit',
      'Basic + Llama 3.3 70B',
      'Unlimited chat history',
      'Priority email support',
      'Document analysis',
      'Code generation'
    ],
    icon: Star,
    color: 'from-blue-500 to-cyan-500',
    popular: false
  },
  pro: {
    id: 'plan_RWzF9BaZU7q9jw',  // Student Pro Pack
    name: 'Student Pro',
    price: 299,
    originalPrice: 399,
    description: 'Most popular choice',
    features: [
      '2000 messages per month',
      '2M token limit',
      'All AI models (Grok 4, Gemini 2.5)',
      'Image generation',
      'Custom prompts',
      'Export conversations',
      'Advanced analytics'
    ],
    icon: Crown,
    color: 'from-purple-500 to-pink-500',
    popular: true
  }
};

export function PaymentDialog({ onClose, onSuccess, showLimitReachedMessage, userTier = 'free' }: PaymentDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLANS>('pro');
  const [isLoading, setIsLoading] = useState(false);
  const { fetchWithAuth } = useAuthApi();
  const { showToast } = useToast();

  // Map userTier to plan key for comparison
  const tierToPlanMap: Record<string, keyof typeof PLANS | null> = {
    'free': null,
    'starter': 'starter',
    'pro': 'pro',
    'pro_plus': 'pro'  // Map pro_plus to pro for comparison
  };

  const currentUserPlan = tierToPlanMap[userTier] || null;
  const isUserOnPaidPlan = userTier !== 'free';

  // Determine if a plan is disabled (user is already on this plan)
  const isPlanDisabled = (planKey: keyof typeof PLANS): boolean => {
    return currentUserPlan === planKey;
  };

  // If user is on a paid plan, auto-select the next tier up
  useEffect(() => {
    if (isUserOnPaidPlan && currentUserPlan) {
      // Auto-select next tier for upgrade
      if (currentUserPlan === 'starter') {
        setSelectedPlan('pro');
      }
      // Pro users can't upgrade to another plan (no pro_plus anymore)
    }
  }, [currentUserPlan, isUserOnPaidPlan]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      
      const plan = PLANS[selectedPlan];

      // Step 1: Create Order
      const orderResponse = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/api/payment/create-order`,
        {
          method: 'POST',
          body: JSON.stringify({
            plan_type: plan.id
          })
        }
      );

      if (!orderResponse.order_id) {
        throw new Error('No order ID returned from server');
      }

      // Step 2: Open Razorpay Checkout
      const options = {
        key: orderResponse.key_id,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'Xcore-ai',
        description: orderResponse.plan_name,
        order_id: orderResponse.order_id,
        handler: async (response: any) => {
          try {
            // Step 3: Verify Payment
            const verifyResponse = await fetchWithAuth(
              `${import.meta.env.VITE_API_BASE_URL}/api/payment/verify`,
              {
                method: 'POST',
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                })
              }
            );
            
            if (verifyResponse.status === 'success') {
              showToast('Payment successful! Subscription activated. 🎉', 'success');
              
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              try {
                const updatedUsage = await fetchWithAuth(
                  `${import.meta.env.VITE_API_BASE_URL}/api/usage`
                );
                
                if (updatedUsage.is_paid) {
                  showToast(`${plan.name} activated! Enjoy your benefits! 🚀`, 'success');
                } else {
                  console.warn('⚠️ Subscription status not updated yet');
                  showToast('Subscription activated! Please refresh if needed.', 'warning');
                }
              } catch (usageError) {
                console.error('Failed to fetch updated usage:', usageError);
                showToast('Payment successful! Please refresh the page.', 'warning');
              }
              
              onSuccess();
              
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              showToast('Payment verification failed. Contact support.', 'error');
              console.error('Verification failed:', verifyResponse);
            }
          } catch (error: any) {
            console.error('❌ Verification error:', error);
            showToast('Verification error. Your payment is being processed.', 'warning');
          }
        },
        prefill: {
          email: '',
          contact: ''
        },
        notes: {
          plan_type: plan.id
        },
        theme: { 
          color: '#6366f1'
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            showToast('Payment cancelled', 'info');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

      rzp.on('payment.failed', (response: any) => {
        console.error('❌ Payment failed:', response);
        showToast(`Payment failed: ${response.error.description}`, 'error');
        setIsLoading(false);
      });
      
    } catch (error: any) {
      console.error('❌ Payment initiation failed:', error);
      const errorMessage = error.data?.detail || error.message || 'Unknown error';
      showToast(`Failed to initiate payment: ${errorMessage}`, 'error');
      setIsLoading(false);
    }
  };

  const currentPlan = PLANS[selectedPlan];
  const Icon = currentPlan.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-4xl bg-gradient-to-b from-[#fafafa] to-[#f1f1f1] text-gray-900 rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Choose Your Plan</h2>
            <p className="text-gray-600 mt-1">Select the perfect plan for your needs</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition p-2 rounded-full hover:bg-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {showLimitReachedMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            You've reached your free tier limit. Upgrade to continue using Xcore-ai!
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(PLANS).map(([key, plan]) => {
            const PlanIcon = plan.icon;
            const isSelected = selectedPlan === key;
            const isCurrentPlan = currentUserPlan === key;
            const isDisabled = isCurrentPlan;
            
            return (
              <motion.div
                key={key}
                onClick={() => !isDisabled && setSelectedPlan(key as keyof typeof PLANS)}
                className={`relative p-6 rounded-2xl  border-2 cursor-pointer transition-all ${
                  isDisabled
                    ? 'border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed'
                    : isSelected 
                    ? 'border-black bg-white shadow-lg scale-105' 
                    : 'border-gray-300 bg-white/50 hover:border-gray-400'
                } ${plan.popular && !isDisabled ? 'ring-2 ring-purple-500 ring-offset-2' : ''}`}
                whileHover={!isDisabled ? { y: -4 } : {}}
              >
                {plan.popular && !isDisabled && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    CURRENT PLAN
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <PlanIcon className={`w-8 h-8 bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`} />
                  {isSelected && !isDisabled && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                  {isCurrentPlan && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                </div>

                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">₹{plan.price}</span>
                    <span className="text-gray-400 line-through text-sm">₹{plan.originalPrice}</span>
                  </div>
                  <p className="text-xs text-gray-500">per month</p>
                </div>

                <div className="space-y-2">
                  {plan.features.slice(0, 4).map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                      <span className={isDisabled ? 'text-gray-400' : 'text-gray-700'}>{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}

          {/* Enterprise Plan Card */}
          <motion.div
            className="relative p-6 rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-lg transition-all"
            whileHover={{ y: -4 }}
          >
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                ENTERPRISE
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <Sparkles className="w-8 h-8 text-amber-600" />
            </div>

            <h3 className="text-xl font-bold mb-2 text-amber-900">Enterprise</h3>
            <p className="text-sm text-amber-700 mb-6">Custom solutions tailored to your needs</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-amber-900">Unlimited everything</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-amber-900">Dedicated support</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-amber-900">Custom integration</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-amber-900">API & Webhooks</span>
              </div>
            </div>

            <div className="border-t border-amber-200 pt-4 mt-4">
              <p className="text-xs text-amber-600 font-medium mb-3">Get in touch with our team</p>
              <a
                href="mailto:kousthubha@xcore-ai.com"
                className="inline-block w-full text-center bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium py-2 rounded-lg transition-all"
              >
                Contact Sales
              </a>
            </div>
          </motion.div>
        </div>

        {/* Selected Plan Details */}
        {selectedPlan in PLANS && (
          <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${currentPlan.color} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{currentPlan.name}</h3>
                <p className="text-gray-600 text-sm">{currentPlan.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentPlan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Button */}
        {selectedPlan in PLANS ? (
          <div className="space-y-3">
            <Button
              className="w-full bg-black text-white py-4 text-lg rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePayment}
              disabled={isLoading || isPlanDisabled(selectedPlan)}
            >
              {isLoading ? (
                'Processing...'
              ) : isPlanDisabled(selectedPlan) ? (
                'Already on this plan'
              ) : (
                <>
                  Pay ₹{currentPlan.price}/month
                  <span className="ml-2 text-sm opacity-75">Save ₹{currentPlan.originalPrice - currentPlan.price}!</span>
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              className="text-gray-600 w-full" 
              onClick={onClose}
              disabled={isLoading}
            >
              Maybe Later
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-gray-600 mb-2">
              Our team will get back to you within 24 hours with a custom quote.
            </p>
            <Button 
              variant="ghost" 
              className="text-gray-600 w-full" 
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">
          🔒 Secure payment via Razorpay • Cancel anytime • 7-day money-back guarantee
        </p>
      </motion.div>
    </div>
  );
}
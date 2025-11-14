// frontend/react-fast/app/components/chat/payment-dialog.tsx - FIXED VERSION

declare global {
  interface Window {
    Razorpay: any;
  }
}

import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { useAuthApi } from '~/hooks/useAuthApi';
import { RefreshCw, CheckCircle2, Sparkles, Shield, Brain, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from "~/components/ui/toast";

interface PaymentDialogProps {
  onClose: () => void;
  onSuccess: () => void;
  showLimitReachedMessage?: boolean;
}

const PLANS = {
  basic: {
    id: 'pro_monthly',  // Changed to match backend
    name: 'Student Starter',
    price: 249,
    description: 'Perfect for students and learners',
    features: [
      '1000 messages per month',
      'All AI models (Grok, Gemini, Llama)',
      'Priority support 24/7',
      'Advanced document analysis',
      'Image generation',
      'Custom prompts & analytics'
    ]
  }
};

export function PaymentDialog({ onClose, onSuccess, showLimitReachedMessage }: PaymentDialogProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { fetchWithAuth } = useAuthApi();
  const { showToast } = useToast();

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

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      
      const plan = PLANS.basic;
      
      console.log('🔵 Creating order for:', plan.id);
      
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

      console.log('✅ Order created:', orderResponse);

      if (!orderResponse.order_id) {
        throw new Error('No order ID returned from server');
      }

      // Step 2: Open Razorpay Checkout
      const options = {
        key: orderResponse.key_id,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'SkyGPT',
        description: orderResponse.plan_name,
        order_id: orderResponse.order_id,
        handler: async (response: any) => {
          try {
            console.log('💳 Payment successful, verifying:', response);
            
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
            
            console.log('✅ Verification response:', verifyResponse);
            
            if (verifyResponse.status === 'success') {
              showToast('Payment successful! Subscription activated.', 'success');
              
              // Wait for backend to update
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Verify update
              try {
                const updatedUsage = await fetchWithAuth(
                  `${import.meta.env.VITE_API_BASE_URL}/api/usage`
                );
                
                console.log('📊 Updated usage:', updatedUsage);
                
                if (updatedUsage.is_paid && updatedUsage.subscription_tier === (plan.id.includes('pro') ? 'pro' : 'basic')) {
                  console.log('✅ Subscription status confirmed');
                  showToast('Pro features unlocked! 🎉', 'success');
                } else {
                  console.warn('⚠️ Subscription status not updated yet');
                  showToast('Subscription activated! Please refresh if needed.', 'warning');
                }
              } catch (usageError) {
                console.error('Failed to fetch updated usage:', usageError);
                showToast('Payment successful! Please refresh the page.', 'warning');
              }
              
              // Trigger success callback
              onSuccess();
              
              // Force reload as backup
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
      console.error('Error details:', {
        status: error.status,
        data: error.data,
        message: error.message
      });
      
      const errorMessage = error.data?.detail || error.message || 'Unknown error';
      showToast(`Failed to initiate payment: ${errorMessage}`, 'error');
      
      setIsLoading(false);
    }
  };

  const currentPlan = PLANS;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md">
      <motion.div
        className="relative w-[360px] h-[520px] [perspective:1200px]"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div
              key="front"
              initial={{ rotateY: -180 }}
              animate={{ rotateY: 0 }}
              exit={{ rotateY: 180 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-gradient-to-b from-[#fafafa] to-[#f1f1f1] text-gray-900 rounded-3xl shadow-2xl flex flex-col items-center justify-between p-6"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex justify-between w-full items-center">
                <h2 className="text-lg font-semibold">Choose Plan</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => onClose()}
                    className="text-gray-500 hover:text-gray-800 transition p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Single Plan Card */}
              <div className="w-full">
                <div className="w-full p-4 rounded-xl border-2 border-black bg-black text-white">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="font-semibold">{PLANS.basic.name}</p>
                      <p className="text-sm text-white/80">
                        {PLANS.basic.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">₹{PLANS.basic.price}</p>
                      <p className="text-xs text-white/60">per month</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-6 mt-2">
                <div className="flex flex-col items-center">
                  <Sparkles className="w-6 h-6 text-gray-700" />
                  <p className="text-xs mt-1 text-gray-600">AI Models</p>
                </div>
                <div className="flex flex-col items-center">
                  <Brain className="w-6 h-6 text-gray-700" />
                  <p className="text-xs mt-1 text-gray-600">Smart Tools</p>
                </div>
                <div className="flex flex-col items-center">
                  <Shield className="w-6 h-6 text-gray-700" />
                  <p className="text-xs mt-1 text-gray-600">Secure</p>
                </div>
              </div>

              <Button
                className="w-full bg-black text-white mt-4 rounded-xl hover:bg-gray-800"
                onClick={() => setIsFlipped(true)}
              >
                View Details
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ rotateY: 180 }}
              animate={{ rotateY: 0 }}
              exit={{ rotateY: -180 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-white rounded-3xl shadow-2xl flex flex-col p-6 justify-between"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-lg">{currentPlan.basic.name}</h2>
                <button
                  onClick={() => setIsFlipped(false)}
                  className="text-gray-500 hover:text-gray-800 transition"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto text-sm text-gray-600 space-y-3">
                <p className="text-2xl font-bold text-black">₹{currentPlan.basic.price}/month</p>
                <p className="text-gray-500">{currentPlan.basic.description}</p>
                
                <ul className="space-y-2">
                  {currentPlan.basic.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-gray-800/70" /> {feature}
                    </li>
                  ))}
                </ul>

                {showLimitReachedMessage && (
                  <div className="text-red-600 text-xs mt-3">
                    You've reached your free message limit. Upgrade to continue.
                  </div>
                )}
              </div>

              <div className="space-y-2 mt-4">
                <Button
                  className="w-full bg-black text-white rounded-xl"
                  onClick={handlePayment}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : `Pay ₹${currentPlan.basic.price}`}
                </Button>
                <Button variant="ghost" className="text-gray-600 w-full" onClick={onClose}>
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-gray-400 text-center mt-2">
                Secure payment via Razorpay
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
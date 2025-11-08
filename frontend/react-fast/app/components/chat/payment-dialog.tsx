/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Razorpay: any;
  }
}

import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { useAuthApi } from '~/hooks/useAuthApi';
import { RefreshCw, CheckCircle2, Sparkles, Shield, Brain, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from "~/components/ui/toast";

interface PaymentDialogProps {
  onClose: () => void;
  onSuccess: () => void;
  showLimitReachedMessage?: boolean;
}

const PLAN = {
  id: 'plan_RXO8u03kq5VmFN',
  name: 'Student Pro Pack',
  price: 249,
  description: 'Unlock full AI power & premium features for smarter workflows.',
  features: [
    'Unlimited messages per day',
    'Pro AI Models (Grok, Gemini, Llama)',
    'Priority support',
    'Advanced document analysis',
    'Image generation + multimodal input',
    'Custom prompts & analytics',
  ]
};

export function PaymentDialog({ onClose, onSuccess, showLimitReachedMessage }: PaymentDialogProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { fetchWithAuth } = useAuthApi();
  const { showToast } = useToast();

  useEffect(() => {
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
      
      console.log('🔵 Creating subscription with:', {
        plan_type: "pro",  // ✅ Send "pro" instead of Razorpay plan ID
        total_count: 12
      });
      
      const subscriptionResponse = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/api/subscription/create`,
        {
          method: 'POST',
          body: JSON.stringify({
            plan_type: "pro",  // ✅ Use "pro" - backend will map to Razorpay plan ID
            total_count: 12,
            user_id: ""  // Backend will use authenticated user ID
          })
        }
      );

      console.log('✅ Subscription created:', subscriptionResponse);

      if (!subscriptionResponse.razorpay_subscription_id) {
        throw new Error('No subscription ID returned from server');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: subscriptionResponse.razorpay_subscription_id,
        name: 'AI Chat Subscription',
        description: `${PLAN.name} Plan - Monthly Subscription`,
        handler: async (response: any) => {
          try {
            console.log('💳 Payment successful, verifying:', response);
            
            const verifyResponse = await fetchWithAuth(
              `${import.meta.env.VITE_API_BASE_URL}/api/subscription/verify`,
              {
                method: 'POST',
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_subscription_id: response.razorpay_subscription_id,
                  razorpay_signature: response.razorpay_signature
                })
              }
            );
            
            console.log('✅ Verification response:', verifyResponse);
            
            if (verifyResponse.status === 'success') {
              showToast('Payment successful! Subscription activated.', 'success');
              onSuccess();
            } else {
              showToast('Payment verification failed. Contact support.', 'error');
              console.error('Verification failed:', verifyResponse);
            }
          } catch (error: any) {
            console.error('❌ Verification error:', error);
            showToast('Verification error. Your payment is being processed.', 'warning');
          }
        },
        theme: { color: '#111111' },
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
      console.error('❌ Subscription creation failed:', error);
      console.error('Error details:', {
        status: error.status,
        data: error.data,
        message: error.message
      });
      
      // Better error handling
      const errorMessage = error.data?.detail || error.message || 'Unknown error';
      showToast(`Failed to create subscription: ${errorMessage}`, 'error');
      
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
      <motion.div
        className="relative w-[360px] h-[480px] [perspective:1200px]"
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
                <h2 className="text-lg font-semibold">{PLAN.name}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => onClose()}
                    className="text-gray-500 hover:text-gray-800 transition p-1 rounded-full hover:bg-gray-100"
                    aria-label="Close dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="text-gray-500 hover:text-gray-800 transition p-1 rounded-full hover:bg-gray-100"
                    aria-label="More info"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center text-center mt-6 space-y-3">
                <p className="text-5xl font-bold">₹{PLAN.price}</p>
                <p className="text-sm text-gray-500">per month</p>

                <div className="flex justify-center gap-6 mt-6">
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
                  <div className="flex flex-col items-center">
                    <Zap className="w-6 h-6 text-gray-700" />
                    <p className="text-xs mt-1 text-gray-600">Fast</p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-black text-white mt-6 rounded-xl hover:bg-gray-800"
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
                <h2 className="font-semibold text-lg">More About Pro</h2>
                <button
                  onClick={() => setIsFlipped(false)}
                  className="text-gray-500 hover:text-gray-800 transition"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto text-sm text-gray-600 space-y-3">
                <p><strong>{PLAN.name}</strong> gives you access to:</p>
                <ul className="space-y-2">
                  {PLAN.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-gray-800/70" /> {feature}
                    </li>
                  ))}
                </ul>

                {showLimitReachedMessage && (
                  <div className="text-red-600 text-xs mt-3">
                    You've reached your free message limit. Upgrade to continue using AI.
                  </div>
                )}
              </div>

              <div className="space-y-2 mt-4">
                <Button
                  className="w-full bg-black text-white rounded-xl"
                  onClick={handleSubscription}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Proceed to Payment'}
                </Button>
                <Button variant="ghost" className="text-gray-600 w-full" onClick={onClose}>
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-gray-400 text-center mt-2">
                You'll be redirected to Razorpay to complete payment
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
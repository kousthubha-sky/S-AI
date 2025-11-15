"use client";
import { Card, CardContent, CardFooter } from "./card";
import { TimelineContent } from "../ui/timeline-animation";
import { VerticalCutReveal } from "../ui/vertical-cut-reveal";
import { cn } from "~/lib/utils";
import NumberFlow from "@number-flow/react";
import {
  Briefcase,
  CheckCheck,
  Database,
  Server,
  Crown,
  Star,
  Sparkles,
  CheckCircle2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { useAuthApi } from "~/hooks/useAuthApi";
import { useToast } from "~/components/ui/toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLANS = {
  starter: {
    id: "plan_RWzEUovz8FVbX4",
    name: "Student Starter",
    price: 199,
    originalPrice: 249,
    description: "Perfect for students",
    features: [
      "500 messages per month",
      "500K token limit",
      "Basic + Llama 3.3 70B",
      "Unlimited chat history",
      "Priority email support",
      "Document analysis",
      "Code generation",
    ],
    icon: Star,
    color: "from-blue-500 to-cyan-500",
    popular: false,
  },
  pro: {
    id: "plan_RWzF9BaZU7q9jw",
    name: "Student Pro",
    price: 299,
    originalPrice: 399,
    description: "Most popular choice",
    features: [
      "2000 messages per month",
      "2M token limit",
      "All AI models (Grok 4, Gemini 2.5)",
      "Image generation",
      "Custom prompts",
      "Export conversations",
      "Advanced analytics",
    ],
    icon: Crown,
    color: "from-purple-500 to-pink-500",
    popular: true,
  },
};

const PricingSwitch = ({
  onSwitch,
  className,
}: {
  onSwitch: (value: string) => void;
  className?: string;
}) => {
  const [selected, setSelected] = useState("0");

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className={cn("flex justify-center", className)}>
      <div className="relative z-10 mx-auto flex w-fit rounded-full bg-neutral-50 border border-gray-200 p-1">
        <button
          onClick={() => handleSwitch("0")}
          className={cn(
            "relative z-10 w-fit sm:h-12 cursor-pointer h-10  rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors",
            selected === "0"
              ? "text-black"
              : "text-muted-foreground hover:text-black",
          )}
        >
          {selected === "0" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 sm:h-12 h-10 w-full rounded-full border-4 shadow-sm shadow-neutral-300 border-neutral-300 bg-gradient-to-t from-neutral-100 via-neutral-200 to-neutral-300"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">Monthly</span>
        </button>

        <button
          onClick={() => {
            // Disabled - do nothing
          }}
          disabled={true}
          className={cn(
            "relative z-10 w-fit cursor-not-allowed sm:h-12 h-10 flex-shrink-0 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors opacity-50",
            selected === "1"
              ? "text-black"
              : "text-muted-foreground hover:text-muted-foreground",
          )}
        >
          {selected === "1" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 sm:h-12 h-10  w-full  rounded-full border-4 shadow-sm shadow-neutral-300 border-neutral-300 bg-gradient-to-t from-neutral-100 via-neutral-200 to-neutral-300"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            Yearly
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-black">
              Coming Soon
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default function PricingSection4() {
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLANS>('pro');
  const [userTier, setUserTier] = useState<'free' | 'starter' | 'pro' | 'pro_plus'>('free');
  const pricingRef = useRef<HTMLDivElement>(null);
  const { fetchWithAuth } = useAuthApi();
  const { showToast } = useToast();

  const tierToPlanMap: Record<string, keyof typeof PLANS | null> = {
    free: null,
    starter: 'starter',
    pro: 'pro',
    pro_plus: 'pro',
  };

  const currentUserPlan = tierToPlanMap[userTier] || null;

  const isPlanDisabled = (planKey: keyof typeof PLANS): boolean => {
    return currentUserPlan === planKey;
  };

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.4,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async (planKey: keyof typeof PLANS) => {
    if (isPlanDisabled(planKey)) {
      showToast('You already have this plan!', 'info');
      return;
    }

    const plan = PLANS[planKey];
    setIsLoading(true);

    try {
      // Step 1: Create Order
      const orderResponse = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/api/payment/create-order`,
        {
          method: 'POST',
          body: JSON.stringify({
            plan_type: plan.id,
          }),
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
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            );

            console.log('✅ Verification response:', verifyResponse);

            if (verifyResponse.status === 'success') {
              showToast('Payment successful! Subscription activated. 🎉', 'success');

              await new Promise(resolve => setTimeout(resolve, 1000));

              try {
                const updatedUsage = await fetchWithAuth(
                  `${import.meta.env.VITE_API_BASE_URL}/api/usage`
                );

                console.log('📊 Updated usage:', updatedUsage);

                if (updatedUsage.is_paid) {
                  console.log('✅ Subscription status confirmed');
                  showToast(`${plan.name} activated! Enjoy your benefits! 🚀`, 'success');
                  setUserTier(updatedUsage.tier || 'free');
                } else {
                  console.warn('⚠️ Subscription status not updated yet');
                  showToast('Subscription activated! Please refresh if needed.', 'warning');
                }
              } catch (usageError) {
                console.error('Failed to fetch updated usage:', usageError);
                showToast('Payment successful! Please refresh the page.', 'warning');
              }

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
          } finally {
            setIsLoading(false);
          }
        },
        prefill: {
          email: '',
          contact: '',
        },
        notes: {
          plan_type: plan.id,
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            showToast('Payment cancelled', 'info');
          },
        },
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

  const togglePricingPeriod = (value: string) =>
    setIsYearly(Number.parseInt(value) === 1);

  // Fetch user subscription status on component mount
  useEffect(() => {
    const fetchUserSubscription = async () => {
      try {
        const subscription = localStorage.getItem('userSubscription');
        if (subscription) {
          const subData = JSON.parse(subscription);
          setUserTier(subData.tier || 'free');
        }
      } catch (error) {
        console.error('Failed to fetch user subscription:', error);
      }
    };

    fetchUserSubscription();

    // Listen for subscription updates
    const handleSubscriptionUpdate = () => {
      fetchUserSubscription();
    };

    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    
    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, []);

  const plans = [
    {
      name: "Starter",
      description: "Great for small businesses and startups looking to get started with AI",
      price: PLANS.starter.price,
      yearlyPrice: Math.round(PLANS.starter.price * 12 * 0.8), // 20% discount
      buttonText: "Get started",
      buttonVariant: "outline" as const,
      features: [
        { text: "Up to 10 boards per workspace", icon: <Briefcase size={20} /> },
        { text: "Up to 10GB storage", icon: <Database size={20} /> },
        { text: "Limited analytics", icon: <Server size={20} /> },
      ],
      includes: PLANS.starter.features,
      planKey: 'starter' as keyof typeof PLANS,
    },
    {
      name: "Business",
      description: "Best value for growing businesses that need more advanced features",
      price: PLANS.pro.price,
      yearlyPrice: Math.round(PLANS.pro.price * 12 * 0.8), // 20% discount
      buttonText: "Get started",
      buttonVariant: "outline" as const,
      features: [
        { text: "Unlimited boards", icon: <Briefcase size={20} /> },
        { text: "Storage (250MB/file)", icon: <Database size={20} /> },
        { text: "100 workspace command runs", icon: <Server size={20} /> },
      ],
      includes: PLANS.pro.features,
      popular: true,
      planKey: 'pro' as keyof typeof PLANS,
    },
    {
      name: "Enterprise",
      description: "Advanced plan with enhanced security and unlimited access for large teams",
      price: 899,
      yearlyPrice: 2999,
      buttonText: "Contact Sales",
      buttonVariant: "default" as const,
      features: [
        { text: "Unlimited boards", icon: <Briefcase size={20} /> },
        { text: "Unlimited storage", icon: <Database size={20} /> },
        { text: "Unlimited workspaces", icon: <Server size={20} /> },
      ],
      includes: [
        "Everything in Business, plus:",
        "Multi-board management",
        "Multi-board guest",
        "Attachment permissions",
        "Custom integration",
        "Dedicated support",
      ],
      planKey: 'enterprise' as any,
    },
  ];

  return (
    <div
      className="px-4 pt-20 min-h-screen max-w-7xl mx-auto relative"
      ref={pricingRef}
    >
      <article className="flex sm:flex-row flex-col sm:pb-0 pb-4 sm:items-center items-start justify-between">
        <div className="text-left mb-6">
          <h2 className="text-4xl font-medium leading-[130%] text-gray-900 mb-4">
            <VerticalCutReveal
              splitBy="words"
              staggerDuration={0.15}
              staggerFrom="first"
              reverse={true}
              containerClassName="justify-start"
              transition={{
                type: "spring",
                stiffness: 250,
                damping: 40,
                delay: 0,
              }}
            >
              Plans & Pricing
            </VerticalCutReveal>
          </h2>

          <TimelineContent
            as="p"
            animationNum={0}
            timelineRef={pricingRef}
            customVariants={revealVariants}
            className="text-gray-600 w-[80%]"
          >
            Trusted by millions, We help teams all around the world, Explore
            which option is right for you.
          </TimelineContent>
        </div>

        <TimelineContent
          as="div"
          animationNum={1}
          timelineRef={pricingRef}
          customVariants={revealVariants}
        >
          <PricingSwitch onSwitch={togglePricingPeriod} className="shrink-0" />
        </TimelineContent>
      </article>

      <TimelineContent
        as="div"
        animationNum={2}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="grid md:grid-cols-3 gap-4 mx-auto sm:p-3 rounded-lg"
      >
        {plans.map((plan, index) => (
          <TimelineContent
            as="div"
            key={plan.name}
            animationNum={index + 3}
            timelineRef={pricingRef}
            customVariants={revealVariants}
          >
            <Card
              className={`relative flex-col flex justify-between  transition-all duration-300 backdrop-blur-md ${
                selectedPlan === plan.planKey
                  ? "scale-110 ring-2 ring-neutral-900 bg-gradient-to-t from-black to-neutral-900 text-white"
                  : "border-none shadow-none bg-white/10 backdrop-blur-md pt-4 text-gray-900"
              }`}
            >
              <CardContent className="pt-0">
                <div className="space-y-2 pb-3">
                  {selectedPlan === plan.planKey && (
                    <div className="pt-4">
                      <span className="bg-neutral-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Selected
                      </span>
                    </div>
                  )}

                  <div className="flex items-baseline">
                    <span className="text-4xl font-semibold">
                      ₹
                      <NumberFlow
                        format={{
                          currency: "INR",
                        }}
                        value={isYearly ? plan.yearlyPrice : plan.price}
                        className="text-4xl font-semibold"
                      />
                    </span>
                    <span
                      className={
                        selectedPlan === plan.planKey
                          ? "text-neutral-200 ml-1"
                          : "text-gray-600 ml-1"
                      }
                    >
                      /{isYearly ? "year" : "month"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <h3 className="text-3xl font-semibold mb-2">{plan.name}</h3>
                </div>
                <p
                  className={
                    selectedPlan === plan.planKey
                      ? "text-sm text-neutral-200 mb-4"
                      : "text-sm text-gray-600 mb-4"
                  }
                >
                  {plan.description}
                </p>

                <div className={`space-y-3 pt-4 border-t ${selectedPlan === plan.planKey ? "border-neutral-700" : "border-neutral-200"}`}>
                  <h4 className="font-medium text-base mb-3">
                    {plan.includes[0]}
                  </h4>
                  <ul className="space-y-2 font-semibold">
                    {plan.includes.slice(1, 5).map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <span
                          className={
                            selectedPlan === plan.planKey
                              ? "text-white h-6 w-6 bg-neutral-600 border border-neutral-500 rounded-full grid place-content-center mt-0.5 mr-3"
                              : "text-black h-6 w-6 bg-white border border-black rounded-full grid place-content-center mt-0.5 mr-3"
                          }
                        >
                          <CheckCheck className="h-4 w-4" />
                        </span>
                        <span
                          className={
                            selectedPlan === plan.planKey
                              ? "text-sm text-neutral-100"
                              : "text-sm text-gray-600"
                          }
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <button
                  onClick={() => {
                    if (plan.planKey in PLANS) {
                      setSelectedPlan(plan.planKey as keyof typeof PLANS);
                      // Only proceed to payment if already selected, otherwise just select it
                      if (selectedPlan === plan.planKey) {
                        handlePayment(plan.planKey as keyof typeof PLANS);
                      }
                    }
                  }}
                  disabled={isLoading || (plan.planKey in PLANS && isPlanDisabled(plan.planKey as keyof typeof PLANS))}
                  className={`w-full mb-6 p-4 text-xl rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                    selectedPlan === plan.planKey
                      ? "bg-gradient-to-t from-neutral-100 to-neutral-300 font-semibold shadow-lg shadow-neutral-500 border border-neutral-400 text-black hover:from-neutral-200 hover:to-neutral-400 disabled:hover:from-neutral-100 disabled:hover:to-neutral-300"
                      : plan.buttonVariant === "outline"
                        ? "bg-gradient-to-t from-neutral-900 to-neutral-600 shadow-lg shadow-neutral-900 border border-neutral-700 text-white hover:from-neutral-800 hover:to-neutral-700 disabled:hover:from-neutral-900 disabled:hover:to-neutral-600"
                        : "bg-gradient-to-t from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 disabled:hover:from-amber-500 disabled:hover:to-orange-500"
                  }`}
                >
                  {isLoading ? 'Processing...' : plan.planKey in PLANS && isPlanDisabled(plan.planKey as keyof typeof PLANS) ? '✓ Current Plan' : selectedPlan === plan.planKey ? 'Proceed to Payment' : plan.buttonText}
                </button>
              </CardFooter>
            </Card>
          </TimelineContent>
        ))}
      </TimelineContent>

    </div>
  );
}
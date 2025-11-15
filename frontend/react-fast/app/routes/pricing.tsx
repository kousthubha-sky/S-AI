// app/routes/pricing.tsx - 4-TIER VERSION
import { Link } from "react-router";
import { Check, X, Crown, Zap, Star, Sparkles } from "lucide-react";
import Footer from "~/components/layout/footer";

const plans = [
  {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for trying out SkyGPT",
    features: [
      { text: "50 requests per day", included: true },
      { text: "50K tokens per day", included: true },
      { text: "Basic AI models", included: true },
      { text: "Chat history (7 days)", included: true },
      { text: "Standard support", included: true },
      { text: "Priority support", included: false },
      { text: "Advanced AI models", included: false },
      { text: "Image generation", included: false },
    ],
    cta: "Get Started Free",
    ctaLink: "/signup",
    popular: false,
    color: "from-gray-500 to-gray-600",
    icon: Sparkles,
    badge: null
  },
  {
    name: "Student Starter",
    price: 199,
    originalPrice: 249,
    period: "month",
    description: "Great for students & learners",
    features: [
      { text: "500 requests per month", included: true },
      { text: "500K token limit", included: true },
      { text: "Basic + Llama 3.3 70B", included: true },
      { text: "Unlimited chat history", included: true },
      { text: "Priority email support", included: true },
      { text: "Document analysis", included: true },
      { text: "Code generation", included: true },
      { text: "Image generation", included: false },
      { text: "Custom prompts", included: false },
    ],
    cta: "Start 7-Day Trial",
    ctaLink: "/signup?plan=starter",
    popular: false,
    color: "from-blue-500 to-cyan-500",
    icon: Star,
    badge: "BEST VALUE"
  },
  {
    name: "Student Pro",
    price: 299,
    originalPrice: 399,
    period: "month",
    description: "Most popular for serious users",
    features: [
      { text: "2000 requests per month", included: true },
      { text: "2M token limit", included: true },
      { text: "All AI models (Grok 4, Gemini 2.5)", included: true },
      { text: "Image generation", included: true },
      { text: "Custom prompts", included: true },
      { text: "Export conversations", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Priority support (24hr)", included: true },
      { text: "API access", included: false },
    ],
    cta: "Start 7-Day Trial",
    ctaLink: "/signup?plan=pro",
    popular: true,
    color: "from-purple-500 to-pink-500",
    icon: Crown,
    badge: "MOST POPULAR"
  },
  {
    name: "Student Pro Plus",
    price: 599,
    originalPrice: 799,
    period: "month",
    description: "Unlimited power for professionals",
    features: [
      { text: "Unlimited requests", included: true },
      { text: "Unlimited tokens", included: true },
      { text: "All premium AI models", included: true },
      { text: "Priority support (2hr)", included: true },
      { text: "API access", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Custom integrations", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Early access to new features", included: true },
    ],
    cta: "Start 7-Day Trial",
    ctaLink: "/signup?plan=proplus",
    popular: false,
    color: "from-orange-500 to-red-500",
    icon: Zap,
    badge: "UNLIMITED"
  }
];

const comparisonFeatures = [
  {
    category: "Usage Limits",
    features: [
      { name: "Daily/Monthly Requests", free: "50/day", starter: "500/month", pro: "2000/month", proPlus: "Unlimited" },
      { name: "Token Limit", free: "50K/day", starter: "500K/month", pro: "2M/month", proPlus: "Unlimited" },
      { name: "Chat History", free: "7 days", starter: "Forever", pro: "Forever", proPlus: "Forever" },
      { name: "File Uploads", free: "❌", starter: "✅ 5MB", pro: "✅ 10MB", proPlus: "✅ 50MB" },
    ]
  },
  {
    category: "AI Models",
    features: [
      { name: "Basic Models", free: "✅", starter: "✅", pro: "✅", proPlus: "✅" },
      { name: "Llama 3.3 70B", free: "❌", starter: "✅", pro: "✅", proPlus: "✅" },
      { name: "Grok 4 & Gemini 2.5", free: "❌", starter: "❌", pro: "✅", proPlus: "✅" },
      { name: "Image Generation", free: "❌", starter: "❌", pro: "✅", proPlus: "✅" },
    ]
  },
  {
    category: "Features",
    features: [
      { name: "Code Generation", free: "Basic", starter: "Advanced", pro: "Advanced", proPlus: "Advanced" },
      { name: "Document Analysis", free: "❌", starter: "✅", pro: "✅ Advanced", proPlus: "✅ Advanced" },
      { name: "Export Chats", free: "❌", starter: "✅", pro: "✅", proPlus: "✅" },
      { name: "Custom Prompts", free: "❌", starter: "❌", pro: "✅", proPlus: "✅" },
      { name: "API Access", free: "❌", starter: "❌", pro: "❌", proPlus: "✅" },
    ]
  },
  {
    category: "Support",
    features: [
      { name: "Response Time", free: "48 hours", starter: "24 hours", pro: "24 hours", proPlus: "2 hours" },
      { name: "Support Channels", free: "Email", starter: "Email", pro: "Email", proPlus: "Email + Chat + Phone" },
      { name: "Dedicated Manager", free: "❌", starter: "❌", pro: "❌", proPlus: "✅" },
    ]
  }
];

const faqs = [
  {
    question: "What's the difference between the plans?",
    answer: "Each plan offers different usage limits and features. Free is great for trying out, Starter is perfect for students, Pro adds premium AI models and image generation, and Pro Plus gives you unlimited everything with priority support."
  },
  {
    question: "Can I upgrade or downgrade anytime?",
    answer: "Yes! You can change plans at any time. Upgrades take effect immediately, and downgrades take effect at your next billing cycle. You'll never lose your chat history."
  },
  {
    question: "What happens if I exceed my limits?",
    answer: "On Free, you'll need to wait until the next day. On paid plans, you can upgrade to a higher tier or wait for your monthly reset. We'll notify you when you're approaching your limits."
  },
  {
    question: "Do you offer student discounts?",
    answer: "Our plans are already designed with students in mind! All paid plans include 'Student' in the name because they're priced specifically for students at 20-30% below market rates."
  },
  {
    question: "What AI models do I get access to?",
    answer: "Free includes basic models. Starter adds Llama 3.3 70B. Pro includes Grok 4, Gemini 2.5 Flash, and image generation. Pro Plus gets you access to ALL current and future premium models."
  },
  {
    question: "Is there a money-back guarantee?",
    answer: "Yes! All paid plans come with a 7-day money-back guarantee. If you're not satisfied for any reason, contact us within 7 days for a full refund."
  },
  {
    question: "Can I use SkyGPT for commercial projects?",
    answer: "Free tier is for personal use only. All paid plans (Starter, Pro, Pro Plus) allow commercial use. Check our Terms of Service for specific guidelines."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit/debit cards, UPI, net banking, and popular digital wallets through our secure payment partner Razorpay."
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold mb-6">
              Choose Your Perfect Plan
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mt-2">
                Save up to 25% with Student Pricing
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Start free, upgrade when you need more. All plans include a 7-day money-back guarantee.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <div
                key={index}
                className={`relative rounded-3xl p-6 ${
                  plan.popular 
                    ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 scale-105' 
                    : 'bg-white/5 border border-white/10'
                } hover:scale-105 transition-all`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className={`bg-gradient-to-r ${plan.color} text-white px-3 py-1 rounded-full text-xs font-semibold`}>
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">₹{plan.price}</span>
                    {plan.originalPrice && (
                      <span className="text-gray-400 line-through text-sm">₹{plan.originalPrice}</span>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">/{plan.period}</span>
                  {plan.originalPrice && (
                    <div className="text-green-400 text-xs mt-1">
                      Save ₹{plan.originalPrice - plan.price}/month
                    </div>
                  )}
                </div>

                <Link
                  to={plan.ctaLink}
                  className={`block w-full py-3 rounded-lg font-semibold text-center mb-6 transition ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {plan.cta}
                </Link>

                <div className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />
                      ) : (
                        <X className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
                      )}
                      <span className={`text-sm ${feature.included ? "text-gray-300" : "text-gray-600"}`}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Detailed Feature Comparison</h2>
          <p className="text-xl text-gray-400">
            Compare all features across plans
          </p>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5">
                <th className="px-6 py-4 text-left font-semibold">Feature</th>
                <th className="px-6 py-4 text-center font-semibold">Free</th>
                <th className="px-6 py-4 text-center font-semibold">Starter</th>
                <th className="px-6 py-4 text-center font-semibold">Pro</th>
                <th className="px-6 py-4 text-center font-semibold">Pro Plus</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((category, catIndex) => (
                <>
                  <tr key={catIndex} className="bg-white/10">
                    <td colSpan={5} className="px-6 py-3 font-semibold text-sm">
                      {category.category}
                    </td>
                  </tr>
                  {category.features.map((feature, featIndex) => (
                    <tr
                      key={featIndex}
                      className="border-t border-white/5 hover:bg-white/5"
                    >
                      <td className="px-6 py-4 text-gray-300 text-sm">{feature.name}</td>
                      <td className="px-6 py-4 text-center text-gray-400 text-sm">{feature.free}</td>
                      <td className="px-6 py-4 text-center text-blue-400 text-sm">{feature.starter}</td>
                      <td className="px-6 py-4 text-center text-purple-400 text-sm">{feature.pro}</td>
                      <td className="px-6 py-4 text-center text-orange-400 text-sm">{feature.proPlus}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-gradient-to-b from-white/5 to-transparent py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-400">
              Everything you need to know about our pricing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition"
              >
                <h3 className="text-lg font-semibold mb-3">{faq.question}</h3>
                <p className="text-gray-400 text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Money Back Guarantee */}
      <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl p-12 text-center border border-green-500/30">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold mb-4">7-Day Money-Back Guarantee</h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">
            Try any paid plan risk-free. Not satisfied? Get a full refund within 7 days—no questions asked.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl p-12 text-center border border-white/10">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of students already boosting their productivity with SkyGPT
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link 
              to="/signup"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-semibold text-lg transition"
            >
              Start Free Trial
            </Link>
            <Link 
              to="/features"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-lg font-semibold text-lg border border-white/20 transition"
            >
              Explore Features
            </Link>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400 flex-wrap">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>7-day money-back guarantee</span>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
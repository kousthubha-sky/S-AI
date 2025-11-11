// app/routes/pricing.tsx
import { Link } from "react-router";
import { Check, X, Crown, Zap, Star } from "lucide-react";
import Footer from "~/components/layout/footer";

const plans = [
  {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for trying out SkyGPT",
    features: [
      { text: "25 messages per day", included: true },
      { text: "Access to basic AI models", included: true },
      { text: "Chat history (7 days)", included: true },
      { text: "Standard support", included: true },
      { text: "Community access", included: true },
      { text: "Priority support", included: false },
      { text: "Advanced AI models", included: false },
      { text: "Unlimited messages", included: false },
      { text: "Image generation", included: false },
    ],
    cta: "Get Started",
    ctaLink: "/signup",
    popular: false,
    color: "from-gray-500 to-gray-600"
  },
  {
    name: "Student Starter",
    price: 249,
    period: "month",
    description: "Ideal for students and learners",
    features: [
      { text: "1000 messages per month", included: true },
      { text: "All basic AI models", included: true },
      { text: "Unlimited chat history", included: true },
      { text: "Priority email support", included: true },
      { text: "Document analysis", included: true },
      { text: "Code generation", included: true },
      { text: "Export conversations", included: true },
      { text: "Advanced AI models", included: false },
      { text: "Image generation", included: false },
    ],
    cta: "Start 7-Day Trial",
    ctaLink: "/signup?plan=student",
    popular: true,
    color: "from-blue-500 to-purple-500"
  }
];

const faqs = [
  {
    question: "Can I change plans anytime?",
    answer: "Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the start of your next billing cycle."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit/debit cards, UPI, net banking, and digital wallets through our secure payment partner Razorpay."
  },
  {
    question: "Is there a refund policy?",
    answer: "Yes, we offer a 7-day money-back guarantee on all paid plans. If you're not satisfied, contact us within 7 days for a full refund."
  },
  {
    question: "What happens when I reach the message limit?",
    answer: "On the Free plan, you'll need to wait until the next day (limits reset daily). On paid plans, you can upgrade for more messages or wait for the monthly reset."
  },
  {
    question: "Do unused messages roll over?",
    answer: "No, unused messages don't roll over to the next billing period. However, the Pro plan offers unlimited messages, so you never have to worry about limits."
  },
  {
    question: "Can I use SkyGPT for commercial purposes?",
    answer: "Yes, all paid plans allow commercial use. Make sure to review our Terms of Service for specific guidelines."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely! We use bank-grade encryption, secure Auth0 authentication, and never share your data with third parties. See our Privacy Policy for details."
  },
  {
    question: "What AI models are included?",
    answer: "Free includes basic models like DeepSeek and Mistral. Student Starter adds Llama 4 and Qwen. Pro includes all models: Grok 4, Gemini 2.5 Flash, and more."
  }
];

const comparisonFeatures = [
  {
    category: "Usage Limits",
    features: [
      { name: "Daily/Monthly Messages", free: "25/day", student: "1000/month", pro: "Unlimited" },
      { name: "Chat History", free: "7 days", student: "Forever", pro: "Forever" },
      { name: "File Uploads", free: "❌", student: "✅ 10MB", pro: "✅ 50MB" },
    ]
  },
  {
    category: "AI Models",
    features: [
      { name: "Basic Models (DeepSeek, Mistral)", free: "✅", student: "✅", pro: "✅" },
      { name: "Llama 4 & Qwen", free: "❌", student: "✅", pro: "✅" },
      { name: "Grok 4 & Gemini 2.5", free: "❌", student: "❌", pro: "✅" },
      { name: "Image Generation", free: "❌", student: "❌", pro: "✅" },
    ]
  },
  {
    category: "Features",
    features: [
      { name: "Code Generation", free: "Basic", student: "Advanced", pro: "Advanced" },
      { name: "Document Analysis", free: "❌", student: "✅", pro: "✅ Advanced" },
      { name: "Export Chats", free: "❌", student: "✅", pro: "✅" },
      { name: "Custom Prompts", free: "❌", student: "❌", pro: "✅" },
    ]
  },
  {
    category: "Support",
    features: [
      { name: "Response Time", free: "48 hours", student: "24 hours", pro: "2 hours" },
      { name: "Support Channels", free: "Email", student: "Email", pro: "Email + Chat" },
      { name: "Priority Queue", free: "❌", student: "✅", pro: "✅✅" },
    ]
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
              Simple, Transparent Pricing
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Choose Your Plan
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Start free, upgrade when you need more. No hidden fees, cancel anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-3xl p-8 ${
                plan.popular 
                  ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500/50 scale-105' 
                  : 'bg-white/5 border border-white/10'
              } hover:scale-105 transition-all`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold">₹{plan.price}</span>
                  <span className="text-gray-400">/{plan.period}</span>
                </div>
              </div>

              <Link
                to={plan.ctaLink}
                className={`block w-full py-3 rounded-lg font-semibold text-center mb-6 transition ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {plan.cta}
              </Link>

              <div className="space-y-3">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={feature.included ? "text-gray-300" : "text-gray-600"}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Detailed Comparison</h2>
          <p className="text-xl text-gray-400">
            Compare all features across plans
          </p>
        </div>

        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          {comparisonFeatures.map((category, catIndex) => (
            <div key={catIndex} className={catIndex > 0 ? "border-t border-white/10" : ""}>
              <div className="bg-white/5 px-6 py-3">
                <h3 className="font-semibold text-lg">{category.category}</h3>
              </div>
              {category.features.map((feature, featIndex) => (
                <div
                  key={featIndex}
                  className="grid grid-cols-4 gap-4 px-6 py-4 border-t border-white/5 hover:bg-white/5"
                >
                  <div className="col-span-1 text-gray-300">{feature.name}</div>
                  <div className="text-center text-gray-400">{feature.free}</div>
                  <div className="text-center text-blue-400">{feature.student}</div>
                  <div className="text-center text-purple-400">{feature.pro}</div>
                </div>
              ))}
            </div>
          ))}
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

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/20 transition"
              >
                <h3 className="text-lg font-semibold mb-3">{faq.question}</h3>
                <p className="text-gray-400">{faq.answer}</p>
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
            Try any paid plan risk-free. If you're not completely satisfied within the first 7 days, 
            we'll give you a full refund—no questions asked.
          </p>
          <Link 
            to="/refund"
            className="text-green-400 hover:text-green-300 underline"
          >
            Read our refund policy
          </Link>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl p-12 text-center border border-white/10">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already boosting their productivity with SkyGPT
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
          
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
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
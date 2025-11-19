// app/routes/features.tsx
import { Link } from "react-router";
import { 
  MessageSquare, 
  Brain, 
  Zap, 
  Shield, 
  Globe, 
  Code, 
  FileText, 
  Clock, 
  Users,
  Sparkles,
  CheckCircle,
  TrendingUp
} from "lucide-react";
import Footer from "~/components/layout/footer";

const features = [
  {
    icon: MessageSquare,
    title: "Multiple AI Models",
    description: "Access to cutting-edge AI models including Llama 4, Gemini 2.5, Grok 4, DeepSeek, and Qwen 3.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Brain,
    title: "Smart Model Selection",
    description: "Our AI automatically selects the best model for your query - coding, reasoning, or general chat.",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Get responses in seconds with our optimized infrastructure and edge computing.",
    color: "from-yellow-500 to-orange-500"
  },
  {
    icon: Globe,
    title: "Multilingual Support",
    description: "Chat in 100+ languages with native understanding including Hindi, Spanish, and more.",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Code,
    title: "Code Generation",
    description: "Generate, debug, and optimize code across multiple programming languages.",
    color: "from-indigo-500 to-blue-500"
  },
  {
    icon: FileText,
    title: "Document Analysis",
    description: "Upload and analyze PDFs, documents, and images for intelligent insights.",
    color: "from-red-500 to-pink-500"
  },
  {
    icon: Clock,
    title: "Chat History",
    description: "All your conversations are saved and searchable. Never lose an important discussion.",
    color: "from-teal-500 to-cyan-500"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption, secure authentication with Auth0, and GDPR compliance.",
    color: "from-gray-500 to-slate-500"
  },
  {
    icon: Users,
    title: "Priority Support",
    description: "Get help from our team within 24 hours. Pro users get 24/7 priority support.",
    color: "from-orange-500 to-red-500"
  }
];

const useCases = [
  {
    title: "Students & Learners",
    description: "Get homework help, study assistance, and learn new concepts with personalized explanations.",
    icon: "🎓"
  },
  {
    title: "Developers",
    description: "Debug code, learn new frameworks, and build projects faster with AI-powered coding assistance.",
    icon: "👨‍💻"
  },
  {
    title: "Content Creators",
    description: "Generate ideas, write blog posts, create social media content, and overcome writer's block.",
    icon: "✍️"
  },
  {
    title: "Business Professionals",
    description: "Draft emails, create presentations, analyze data, and automate repetitive tasks.",
    icon: "💼"
  },
  {
    title: "Researchers",
    description: "Summarize papers, find relevant information, and explore complex topics efficiently.",
    icon: "🔬"
  },
  {
    title: "Language Learners",
    description: "Practice conversations, translate text, and improve your language skills interactively.",
    icon: "🗣️"
  }
];

const modelComparison = [
  {
    name: "Llama 4 Maverick",
    description: "Best for general chat and reasoning",
    strengths: ["128K context", "Multilingual", "Fast responses"]
  },
  {
    name: "Grok 4 Fast",
    description: "Enterprise-grade with huge context",
    strengths: ["2M context", "Multimodal", "High accuracy"]
  },
  {
    name: "Gemini 2.5 Flash",
    description: "Image generation and editing",
    strengths: ["Image creation", "Vision AI", "Multi-turn chat"]
  },
  {
    name: "DeepSeek Chimera",
    description: "Optimized for complex tasks",
    strengths: ["Deep reasoning", "Math & logic", "Technical writing"]
  },
  {
    name: "Qwen 3 235B",
    description: "Advanced reasoning mode",
    strengths: ["100+ languages", "Thinking mode", "Code expertise"]
  }
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold mb-6">
              Powerful AI Features
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Built for Everyone
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Access cutting-edge AI models, smart automation, and enterprise-grade security 
              in one powerful platform. Perfect for students, developers, and professionals.
            </p>
            <div className="flex gap-4 justify-center">
              <Link 
                to="/login"
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-semibold transition"
              >
                Get Started Free
              </Link>
              <Link 
                to="/pricing"
                className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold border border-white/20 transition"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Core Features Grid */}
      <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-xl text-gray-400">
            Powerful features that make AI accessible and useful for everyone
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all hover:scale-105"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Models Section */}
      <div className="bg-gradient-to-b from-transparent to-white/5 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Multiple AI Models</h2>
            <p className="text-xl text-gray-400">
              Choose from the best AI models or let our system pick the perfect one for you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modelComparison.map((model, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold">{model.name}</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">{model.description}</p>
                <div className="space-y-2">
                  {model.strengths.map((strength, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Built for Your Needs</h2>
          <p className="text-xl text-gray-400">
            Whatever you do, xcore-ai has you covered
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="text-4xl mb-4">{useCase.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{useCase.title}</h3>
              <p className="text-gray-400">{useCase.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-b from-white/5 to-transparent py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-blue-400 mb-2">10+</div>
              <div className="text-gray-400">AI Models</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-purple-400 mb-2">100+</div>
              <div className="text-gray-400">Languages</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-pink-400 mb-2">2M</div>
              <div className="text-gray-400">Context Tokens</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-green-400 mb-2">24/7</div>
              <div className="text-gray-400">Availability</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl p-12 text-center border border-white/10">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already using xcore-ai to boost their productivity
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              to="/login"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-semibold text-lg transition"
            >
              Start Free Trial
            </Link>
            <Link 
              to="/pricing"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-lg font-semibold text-lg border border-white/20 transition"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
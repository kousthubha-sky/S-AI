// app/routes/about.tsx
import { Link } from "react-router";
import { Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import Footer from "~/components/layout/footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold mb-6">
              About Xcore-ai
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                AI-Powered Chat Platform
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Making advanced AI accessible to everyone. Built with passion in India.
            </p>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-gray-300 mb-4">
              At Xcore-ai, we believe that everyone should have access to cutting-edge AI technology. 
              We've built a platform that brings together the best AI models from around the world 
              in one simple, affordable interface.
            </p>
            <p className="text-gray-300 mb-4">
              Whether you're a student learning new concepts, a developer building the next big thing, 
              or a professional looking to boost productivity, xcore-ai is designed for you.
            </p>
            <p className="text-gray-300">
              We're committed to transparency, security, and putting our users first. Your data is yours, 
              and we'll never share it without your permission.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-4">Company Details</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-gray-400">Bengaluru, Karnataka, India</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">Business Email</p>
                    <a href="mailto:kousthubha@xcore-ai.com" className="text-blue-400 hover:text-blue-300">
                      support@xcore-ai.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">Support Hours</p>
                    <p className="text-gray-400">24/7 Email Support</p>
                    <p className="text-gray-400 text-sm">Response within 24-48 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-gradient-to-b from-white/5 to-transparent py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Get in Touch</h2>
            <p className="text-xl text-gray-400">
              Have questions? We're here to help
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">General Support</h3>
              <a href="mailto:kousthubha@xcore-ai.com" className="text-blue-400 hover:text-blue-300">
                support@xcore-ai.com
              </a>
              <p className="text-sm text-gray-400 mt-2">
                For general inquiries and support
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Privacy Concerns</h3>
              <a href="mailto:kousthubha@xcore-ai.com" className="text-purple-400 hover:text-purple-300">
                privacy@xcore-ai.com
              </a>
              <p className="text-sm text-gray-400 mt-2">
                For data and privacy related queries
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">Billing & Refunds</h3>
              <a href="mailto:kousthubha@xcore-ai.com" className="text-green-400 hover:text-green-300">
                billing@xcore-ai.com
              </a>
              <p className="text-sm text-gray-400 mt-2">
                For payment and refund requests
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Our Values</h2>
          <p className="text-xl text-gray-400">
            What drives us every day
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚀</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Innovation</h3>
            <p className="text-gray-400">
              Constantly improving and adding new AI models to give you the best experience
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Security</h3>
            <p className="text-gray-400">
              Your data is encrypted and secure. We never share your information with third parties
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💚</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">User First</h3>
            <p className="text-gray-400">
              Every decision we make is focused on providing the best value to our users
            </p>
          </div>
        </div>
      </div>

      {/* Legal Links */}
      <div className="bg-gradient-to-b from-white/5 to-transparent py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <h3 className="text-2xl font-bold mb-6 text-center">Legal & Policies</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link 
                to="/terms"
                className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition text-center"
              >
                <h4 className="font-semibold mb-2">Terms of Service</h4>
                <p className="text-sm text-gray-400">Our user agreement and service terms</p>
              </Link>
              <Link 
                to="/privacy"
                className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition text-center"
              >
                <h4 className="font-semibold mb-2">Privacy Policy</h4>
                <p className="text-sm text-gray-400">How we handle your data</p>
              </Link>
              <Link 
                to="/refund"
                className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition text-center"
              >
                <h4 className="font-semibold mb-2">Refund Policy</h4>
                <p className="text-sm text-gray-400">Cancellation and refund terms</p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl p-12 text-center border border-white/10">
          <h2 className="text-4xl font-bold mb-4">Ready to Experience xcore-ai?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust xcore-ai for their AI needs
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              to="/login"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-semibold text-lg transition"
            >
              Get Started Free
            </Link>
            <Link 
              to="/features"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-lg font-semibold text-lg border border-white/20 transition"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
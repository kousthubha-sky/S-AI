// app/components/layout/Footer.tsx
import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-3 md:grid-cols-3 justify-between gap-8 py-5">
          {/* Brand Section */}
          <div className="grid justify-center">
            <h3 className="text-white font-semibold text-lg mb-2">xcore-ai</h3>
            <p className="text-gray-400 text-sm mb-2">
              AI-powered chat platform.
            </p>
            <p className="text-gray-500 text-xs">
              Bengaluru, Karnataka, India
            </p>
          </div>

          {/* Navigation Links */}
          <div className="grid justify-center">
            <h4 className="text-white font-semibold mb-3">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="text-gray-400 hover:text-white transition text-sm">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href="/features" className="text-gray-400 hover:text-white transition text-sm">
                  Features
                </a>
              </li>
              <li>
                <a href="/pricing" className="text-gray-400 hover:text-white transition text-sm">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Support Section */}
          <div className="grid justify-center">
            <h4 className="text-white font-semibold mb-3">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:kousthubha@xcore-ai.com" className="text-gray-400 hover:text-white transition text-sm">
                  support@xcore-ai.com
                </a>
              </li>
              <li>
                <a href="mailto:kousthubha@xcore-ai.com" className="text-gray-400 hover:text-white transition text-sm">
                  privacy@xcore-ai.com
                </a>
              </li>
              <li className="text-gray-400 text-sm">
                Response Time: 24-48 hours
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm text-center md:text-left">
            © {new Date().getFullYear()} xcore-ai. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link to="/terms" className="text-gray-500 hover:text-white text-sm transition">
              Terms
            </Link>
            <Link to="/privacy" className="text-gray-500 hover:text-white text-sm transition">
              Privacy
            </Link>
            <Link to="/refund" className="text-gray-500 hover:text-white text-sm transition">
              Refund
            </Link>
            <Link to="/about" className="text-gray-500 hover:text-white text-sm transition">
              About
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
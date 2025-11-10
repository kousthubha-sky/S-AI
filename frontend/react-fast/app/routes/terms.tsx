// app/routes/terms.tsx
export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing and using SkyGPT ("Service"), you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Description of Service</h2>
            <p>
              SkyGPT provides AI-powered chat services with multiple language models. We offer both free 
              and premium subscription tiers with different features and usage limits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. 
              You agree to accept responsibility for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Subscription Plans</h2>
            <p className="mb-2"><strong>Free Plan:</strong></p>
            <ul className="list-disc ml-6 mb-4">
              <li>25 messages per day</li>
              <li>Access to basic AI models</li>
              <li>Standard support</li>
            </ul>
            <p className="mb-2"><strong>Student Starter (₹249/month):</strong></p>
            <ul className="list-disc ml-6 mb-4">
              <li>1000 messages per month</li>
              <li>Access to basic AI models</li>
              <li>Priority support</li>
            </ul>
            <p className="mb-2"><strong>Pro Plan (₹499/month):</strong></p>
            <ul className="list-disc ml-6">
              <li>Unlimited messages</li>
              <li>Access to all AI models including Grok, Gemini, Llama</li>
              <li>24/7 priority support</li>
              <li>Advanced features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Payment Terms</h2>
            <p>
              Subscription fees are billed monthly in advance. All payments are processed securely through 
              Razorpay. By subscribing, you authorize us to charge your payment method on a recurring basis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Usage Restrictions</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>Do not use the Service for illegal activities</li>
              <li>Do not attempt to circumvent usage limits</li>
              <li>Do not share your account credentials</li>
              <li>Do not use the Service to generate harmful or abusive content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Intellectual Property</h2>
            <p>
              All content, features, and functionality are owned by SkyGPT and are protected by 
              international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice, for any breach 
              of these Terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Limitation of Liability</h2>
            <p>
              SkyGPT shall not be liable for any indirect, incidental, special, consequential, or punitive 
              damages resulting from your use of or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">10. Contact Information</h2>
            <p>
              For questions about these Terms, please contact us at:<br />
              Email: support@skygpt.com<br />
              Location: Bengaluru, Karnataka, India
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8">
            Last Updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
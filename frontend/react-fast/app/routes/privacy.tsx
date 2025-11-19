// app/routes/privacy.tsx
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Information We Collect</h2>
            <p className="mb-2"><strong>Account Information:</strong></p>
            <ul className="list-disc ml-6 mb-4">
              <li>Email address</li>
              <li>Name</li>
              <li>Profile picture (via Auth0/Google OAuth)</li>
            </ul>
            <p className="mb-2"><strong>Usage Data:</strong></p>
            <ul className="list-disc ml-6 mb-4">
              <li>Chat messages and conversations</li>
              <li>Message count and usage statistics</li>
              <li>AI model preferences</li>
            </ul>
            <p className="mb-2"><strong>Payment Information:</strong></p>
            <ul className="list-disc ml-6">
              <li>Payment details are securely processed by Razorpay</li>
              <li>We store subscription status and transaction IDs</li>
              <li>We do not store your credit card details</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. How We Use Your Information</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>To provide and maintain our Service</li>
              <li>To process your subscription payments</li>
              <li>To improve our AI models and user experience</li>
              <li>To communicate with you about updates and features</li>
              <li>To enforce our Terms of Service</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Data Storage and Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption. We use:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>PostgreSQL database with encrypted connections</li>
              <li>Auth0 for secure authentication</li>
              <li>HTTPS/SSL encryption for all data transmission</li>
              <li>Regular security audits and updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. When you delete your account:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Your personal information is deleted within 30 days</li>
              <li>Chat history is permanently removed</li>
              <li>Subscription information is retained for legal/tax purposes only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Third-Party Services</h2>
            <p className="mb-2">We use the following third-party services:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li><strong>Auth0:</strong> Authentication and user management</li>
              <li><strong>Razorpay:</strong> Payment processing</li>
              <li><strong>OpenRouter:</strong> AI model access (Llama, Gemini, Grok, etc.)</li>
              <li><strong>Vercel:</strong> Application hosting</li>
            </ul>
            <p className="mt-4">
              These services have their own privacy policies and we encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Your Rights</h2>
            <p className="mb-2">Under Indian data protection laws, you have the right to:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Withdraw consent</li>
              <li>Object to data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Cookies and Tracking</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use 
              third-party advertising cookies or tracking scripts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Children's Privacy</h2>
            <p>
              Our Service is not intended for users under 18 years of age. We do not knowingly collect 
              personal information from children. If you believe we have collected data from a minor, 
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">10. Contact Us</h2>
            <p>
              For privacy-related questions or to exercise your rights, contact us at:<br />
              Email: privacy@xcore-ai.com<br />
              Address: Bengaluru, Karnataka, India
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
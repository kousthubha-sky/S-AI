
// app/routes/refund.tsx
export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Refund & Cancellation Policy</h1>
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Subscription Cancellation</h2>
            <p>
              You can cancel your subscription at any time through your account settings. Upon cancellation:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>You will continue to have access to premium features until the end of your current billing period</li>
              <li>No further charges will be made after cancellation</li>
              <li>Your account will automatically downgrade to the free plan</li>
              <li>Your chat history and data will be preserved</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Refund Eligibility</h2>
            <p className="mb-4">
              We offer refunds in the following circumstances:
            </p>
            
            <div className="mb-4">
              <p className="font-semibold mb-2">✅ Eligible for Full Refund:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Technical issues preventing service usage for more than 48 hours</li>
                <li>Duplicate or accidental charges</li>
                <li>Service not as described</li>
                <li>Request made within 7 days of initial subscription</li>
              </ul>
            </div>

            <div className="mb-4">
              <p className="font-semibold mb-2">❌ Not Eligible for Refund:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Change of mind after 7 days</li>
                <li>Failure to cancel before renewal</li>
                <li>Violation of Terms of Service</li>
                <li>Partial month refunds (except for technical issues)</li>
                <li>Free tier upgrades (no payment involved)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Refund Process</h2>
            <p className="mb-4">To request a refund:</p>
            <ol className="list-decimal ml-6 space-y-2">
              <li>Email us at support@skygpt.com with your transaction details</li>
              <li>Include your account email and reason for refund request</li>
              <li>Provide transaction ID or payment receipt</li>
              <li>We will review your request within 2-3 business days</li>
              <li>Approved refunds are processed within 5-7 business days</li>
              <li>Refunds are credited to the original payment method</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Prorated Refunds</h2>
            <p>
              In case of service disruption or technical issues on our end:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Downtime exceeding 48 hours: Prorated refund for affected period</li>
              <li>Major feature outage: Credits or partial refund at our discretion</li>
              <li>Billing errors: Full correction and compensation if applicable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Subscription Renewal</h2>
            <p>
              Subscriptions automatically renew unless cancelled:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>You will receive a reminder email 3 days before renewal</li>
              <li>Cancel anytime before renewal to avoid charges</li>
              <li>No partial refunds for mid-cycle cancellations</li>
              <li>Renewals are non-refundable unless technical issues occur</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Dispute Resolution</h2>
            <p>
              If you're not satisfied with our refund decision:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li>Contact our support team for escalation</li>
              <li>Provide additional documentation if needed</li>
              <li>We aim to resolve disputes within 10 business days</li>
              <li>For payment gateway issues, contact Razorpay support directly</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Student Starter Plan (₹249/month)</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>7-day money-back guarantee from first purchase</li>
              <li>Usage within 100 messages: Full refund eligible</li>
              <li>After 100 messages: No refund, but can cancel future billing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Pro Plan (₹499/month)</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>7-day money-back guarantee from first purchase</li>
              <li>Unlimited usage means refund only for technical issues after 7 days</li>
              <li>Can downgrade to Student Starter instead of canceling</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Processing Time</h2>
            <p className="mb-2">Refund timeline:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Request review: 2-3 business days</li>
              <li>Razorpay processing: 5-7 business days</li>
              <li>Bank credit: Additional 2-5 days (varies by bank)</li>
              <li>Total time: Up to 14 business days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">10. Contact for Refunds</h2>
            <p>
              For refund requests or questions:<br />
              Email: support@skygpt.com<br />
              Subject: Refund Request - [Your Email]<br />
              Response Time: Within 48 hours
            </p>
          </section>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-8">
            <p className="text-blue-300">
              <strong>💡 Pro Tip:</strong> Try our free plan first before subscribing. This helps you 
              understand the service and reduces the need for refunds.
            </p>
          </div>

          <p className="text-sm text-gray-500 mt-8">
            Last Updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
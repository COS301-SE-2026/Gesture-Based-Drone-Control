// src/components/organisms/Terms.jsx
import { Link } from "react-router-dom"

export default function Terms() {
  return (
    <div className="min-h-screen bg-OffWhite dark:bg-OffBlack py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-OffBlack rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-OffBlack dark:text-OffWhite mb-6">
          Terms & Conditions
        </h1>

        <div className="space-y-6 text-Grey dark:text-DarkGrey">
          <section>
            <h2 className="text-xl font-semibold text-OffBlack dark:text-OffWhite mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using Codex Merchants drone services, you agree
              to be bound by these Terms & Conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-OffBlack dark:text-OffWhite mb-3">
              2. Use of Services
            </h2>
            <p>
              You agree to use our drone services only for lawful purposes and
              in accordance with all applicable laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-OffBlack dark:text-OffWhite mb-3">
              3. User Accounts
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-OffBlack dark:text-OffWhite mb-3">
              4. Privacy Policy
            </h2>
            <p>
              Your privacy is important to us. Please review our Privacy Policy
              to understand how we collect and use your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-OffBlack dark:text-OffWhite mb-3">
              5. Limitation of Liability
            </h2>
            <p>
              Codex Merchants shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages resulting from your
              use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-OffBlack dark:text-OffWhite mb-3">
              6. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these terms at any time. Continued
              use of the service constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-OffBlack dark:text-OffWhite mb-3">
              7. Contact Information
            </h2>
            <p>
              For any questions regarding these terms, please contact us at
              codexmerchants@gmail.com
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-Grey/20 dark:border-DarkGrey/20">
          <Link
            to="/signup"
            className="text-Red hover:text-DarkRed font-semibold"
          >
            ← Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}

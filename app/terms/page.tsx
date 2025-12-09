import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use | MRT Foodie',
  description: 'Terms and conditions for using MRT Foodie',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Map
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Use</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <p className="text-gray-600 text-sm">Effective Date: December 2025</p>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By accessing and using MRT Foodie (&quot;the Website&quot;), you accept and agree to be bound
              by these Terms of Use. If you do not agree to these terms, please do not use the Website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Nature of Service</h2>
            <p className="text-gray-700">
              MRT Foodie is a free, non-commercial community project that provides curated food
              recommendations near MRT stations in Singapore. The Website is provided &quot;as is&quot;
              for informational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. No Warranties</h2>
            <p className="text-gray-700 mb-2">
              We make no representations or warranties of any kind, express or implied, about:
            </p>
            <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
              <li>The accuracy, completeness, or reliability of any information</li>
              <li>The availability, quality, or pricing of listed establishments</li>
              <li>Operating hours, menu items, or services of any restaurant</li>
              <li>The continued operation of any listed establishment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Limitation of Liability</h2>
            <p className="text-gray-700">
              MRT Foodie and its creators shall not be liable for any direct, indirect, incidental,
              consequential, or punitive damages arising from your use of, or inability to use,
              the Website or any information provided therein. This includes but is not limited to
              damages resulting from visiting any establishment listed on the Website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Third-Party Content</h2>
            <p className="text-gray-700">
              The Website may contain information sourced from or inspired by third-party websites,
              blogs, and review platforms. We acknowledge these sources on our{' '}
              <Link href="/credits" className="text-orange-600 hover:underline">Credits page</Link>.
              We are not responsible for the content, accuracy, or practices of any third-party sites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Intellectual Property</h2>
            <p className="text-gray-700">
              All trademarks, logos, and brand names mentioned on this Website are the property
              of their respective owners. Their use does not imply endorsement or affiliation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. User Responsibility</h2>
            <p className="text-gray-700">
              Users are responsible for independently verifying any information before making
              decisions based on content from this Website. Always confirm operating hours,
              prices, and availability directly with establishments.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify these Terms of Use at any time. Changes will be
              effective immediately upon posting. Continued use of the Website constitutes
              acceptance of modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
            <p className="text-gray-700">
              These Terms shall be governed by and construed in accordance with the laws of
              the Republic of Singapore.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
            <p className="text-gray-700">
              For questions about these Terms or to report concerns, please contact us at{' '}
              <a href="mailto:hello@mrtfoodie.sg" className="text-orange-600 hover:underline">
                hello@mrtfoodie.sg
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link href="/credits" className="text-orange-600 hover:underline mr-4">Credits</Link>
          <Link href="/privacy" className="text-orange-600 hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

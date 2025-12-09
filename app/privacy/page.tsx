import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | MRT Foodie',
  description: 'Privacy policy for MRT Foodie',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Map
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <p className="text-gray-600 text-sm">Effective Date: December 2025</p>

          <section>
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <p className="text-gray-700">
              MRT Foodie (&quot;we&quot;, &quot;our&quot;, &quot;the Website&quot;) respects your privacy. This policy
              explains what information we collect and how we use it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
            <p className="text-gray-700 mb-2">
              <strong>We do not collect personal information.</strong> However, we may collect:
            </p>
            <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
              <li>Anonymous usage data (page views, search queries) via analytics</li>
              <li>Device and browser information for improving user experience</li>
              <li>Approximate location (if you use location-based features)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Cookies</h2>
            <p className="text-gray-700">
              We may use cookies and similar technologies to improve your experience.
              You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Third-Party Services</h2>
            <p className="text-gray-700 mb-2">We may use third-party services that collect data:</p>
            <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
              <li>Vercel (hosting and analytics)</li>
              <li>Supabase (database services)</li>
            </ul>
            <p className="text-gray-700 mt-2">
              These services have their own privacy policies governing their data practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data Security</h2>
            <p className="text-gray-700">
              We implement reasonable security measures to protect any data collected.
              However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Children&apos;s Privacy</h2>
            <p className="text-gray-700">
              This Website is not directed at children under 13. We do not knowingly
              collect information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. Changes will be posted
              on this page with an updated effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
            <p className="text-gray-700">
              Questions about this Privacy Policy? Contact us at{' '}
              <a href="mailto:hello@mrtfoodie.sg" className="text-orange-600 hover:underline">
                hello@mrtfoodie.sg
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link href="/credits" className="text-orange-600 hover:underline mr-4">Credits</Link>
          <Link href="/terms" className="text-orange-600 hover:underline">Terms of Use</Link>
        </div>
      </div>
    </div>
  );
}

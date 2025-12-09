import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Credits & Sources | MRT Foodie',
  description: 'Acknowledgments and sources for food recommendations',
};

export default function CreditsPage() {
  const sources = [
    {
      name: 'Daniel Food Diary',
      url: 'https://danielfooddiary.com',
      description: 'Cafe and restaurant recommendations',
    },
    {
      name: 'Seth Lui',
      url: 'https://sethlui.com',
      description: 'Food guides and reviews',
    },
    {
      name: 'Miss Tam Chiak',
      url: 'https://www.misstamchiak.com',
      description: 'Singapore food recommendations',
    },
    {
      name: 'Michelin Guide Singapore',
      url: 'https://guide.michelin.com/sg/en',
      description: 'Michelin-starred and Bib Gourmand listings',
    },
    {
      name: 'Burpple',
      url: 'https://www.burpple.com',
      description: 'Restaurant information and reviews',
    },
    {
      name: 'HungryGoWhere',
      url: 'https://www.hungrygowhere.com',
      description: 'Food listings and information',
    },
    {
      name: 'SG Food on Foot',
      url: 'https://www.sgfoodonfoot.com',
      description: 'Food reviews and recommendations',
    },
    {
      name: 'Lady Iron Chef',
      url: 'https://www.ladyironchef.com',
      description: 'Food guides and reviews',
    },
    {
      name: 'ieatishootipost',
      url: 'https://ieatishootipost.sg',
      description: 'Hawker and restaurant reviews',
    },
    {
      name: 'Eatbook',
      url: 'https://eatbook.sg',
      description: 'Food news and recommendations',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Map
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Credits & Sources</h1>

        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Acknowledgments</h2>
          <p className="text-gray-700 mb-4">
            MRT Foodie is a community project that curates food recommendations near MRT stations
            in Singapore. We are grateful to the following food bloggers, reviewers, and platforms
            whose work has helped inform our recommendations:
          </p>

          <div className="space-y-4">
            {sources.map((source) => (
              <div key={source.name} className="border-l-4 border-orange-500 pl-4">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-orange-600 hover:text-orange-800"
                >
                  {source.name}
                </a>
                <p className="text-sm text-gray-600">{source.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>
              <strong>Map Data:</strong> Land Transport Authority (LTA) Singapore MRT Map
            </li>
            <li>
              <strong>MRT Station Data:</strong> Land Transport Authority (LTA) Singapore
            </li>
            <li>
              <strong>Geocoding:</strong> <a href="https://www.onemap.gov.sg" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">OneMap Singapore</a>
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Disclaimer</h2>
          <p className="text-gray-700 mb-4">
            MRT Foodie is an independent, non-commercial project and is not affiliated with,
            endorsed by, or sponsored by any of the sources listed above. All trademarks,
            logos, and brand names are the property of their respective owners.
          </p>
          <p className="text-gray-700 mb-4">
            Restaurant information, including operating hours, prices, and menu items, may
            change without notice. We recommend verifying details directly with the
            establishment before visiting.
          </p>
          <p className="text-gray-700">
            If you are a content creator or business owner and have concerns about how your
            content is referenced, please contact us at{' '}
            <a href="mailto:hello@mrtfoodie.sg" className="text-orange-600 hover:underline">
              hello@mrtfoodie.sg
            </a>
          </p>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Fair Use Notice</h2>
          <p className="text-gray-700">
            This website may contain references to copyrighted material whose use has not been
            specifically authorized by the copyright owner. We believe this constitutes &quot;fair use&quot;
            of such material as provided for in Singapore&apos;s Copyright Act for purposes of review,
            commentary, and non-commercial educational use. The information provided is for
            general informational purposes only and does not constitute professional advice.
          </p>
        </section>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Last updated: December 2025</p>
          <div className="mt-4 space-x-4">
            <Link href="/terms" className="hover:underline">Terms of Use</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import { config } from 'dotenv';
config({ path: '.env.local' });

async function test() {
  const email = process.env.ONEMAP_EMAIL;
  const password = process.env.ONEMAP_PASSWORD;
  console.log('Email:', email);
  console.log('Password set:', password ? 'Yes' : 'No');

  // Get token
  const tokenRes = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  console.log('Token status:', tokenRes.status);
  const tokenData = await tokenRes.json();
  console.log('Token response:', JSON.stringify(tokenData, null, 2));

  if (tokenData.access_token) {
    // Test routing API
    const routeRes = await fetch(
      'https://www.onemap.gov.sg/api/public/routingsvc/route?start=1.319728,103.8421&end=1.319728,103.8450&routeType=walk',
      {
        headers: { 'Authorization': tokenData.access_token }
      }
    );
    console.log('Route status:', routeRes.status);
    const routeText = await routeRes.text();
    console.log('Route response:', routeText.substring(0, 500));
  }
}

test().catch(console.error);

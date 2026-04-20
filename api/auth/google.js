import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID || 'default_client_id');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Missing Google credential' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'
    });
    const payload = ticket.getPayload();
    return res.json({ user: { email: payload.email, name: payload.name, picture: payload.picture } });
  } catch (error) {
    return res.status(401).json({ error: 'Unable to verify Google sign-in' });
  }
}

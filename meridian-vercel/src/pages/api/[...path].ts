// Runs the Express API (server/) inside Next.js, so /api/* is served by the same Vercel project.
// Pages-router API routes hand us Node's req/res, which Express understands natively.
import type { NextApiRequest, NextApiResponse } from 'next';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getApp } = require('../../../server/vercel') as {
  getApp: () => Promise<(req: NextApiRequest, res: NextApiResponse) => void>;
};

export const config = {
  api: { bodyParser: false, externalResolver: true, responseLimit: false }, // Express parses the body itself
  maxDuration: 30,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let app;
  try {
    app = await getApp();
  } catch (err) {
    console.error('❌ API bootstrap failed:', err);
    res.status(503).json({ success: false, message: 'Database unavailable — check MONGODB_URI and Atlas network access' });
    return;
  }
  await new Promise<void>((resolve) => {
    res.once('finish', resolve);
    res.once('close', resolve);
    app(req, res);
  });
}

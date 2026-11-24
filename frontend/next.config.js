// Same-origin proxy: browser talks only to Next; cookies stay SameSite=Strict, no CORS.
module.exports = { async rewrites() { return [{ source: '/api/:path*', destination: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/:path*` }]; },
  async headers() { return [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }, { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'no-referrer' }] }]; } };

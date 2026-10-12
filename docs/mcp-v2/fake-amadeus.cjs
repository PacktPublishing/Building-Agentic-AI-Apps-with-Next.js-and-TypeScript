// Verification-only preload. Prevents any request from reaching Amadeus.
const https = require('node:https');
const { Writable, Readable } = require('node:stream');
https.request = function(options, callback) {
  const host = options.hostname || options.host;
  if (!['test.api.amadeus.com', 'api.amadeus.com'].includes(host)) {
    throw new Error(`External HTTPS blocked in MCP verification: ${host}`);
  }
  const request = new Writable({ write(chunk, encoding, done) { done(); } });
  request.setTimeout = () => request;
  request.on('finish', () => {
    const path = options.path || '';
    const failure = path.includes('ERROR');
    const body = path.includes('/oauth2/token')
      ? { access_token: 'verification-only', token_type: 'Bearer', expires_in: 3600 }
      : failure ? { errors: [{ title: 'Fixture failure', detail: 'Expected test failure' }] }
      : { data: [{ id: 'fixture-city', iataCode: 'PAR', name: 'PARIS', type: 'location' }] };
    const response = Readable.from([JSON.stringify(body)]);
    response.statusCode = failure ? 400 : 200;
    response.statusMessage = failure ? 'Bad Request' : 'OK';
    response.headers = { 'content-type': 'application/json' };
    if (callback) callback(response);
    else request.emit('response', response);
  });
  return request;
};

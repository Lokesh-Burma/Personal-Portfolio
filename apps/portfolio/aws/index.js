// Runs the standalone Next.js server as a single-Region Lambda Web Function.
if (process.env.AWS_LAMBDA_HTTP_ENDPOINT) {
  const endpoint = new URL('http://' + process.env.AWS_LAMBDA_HTTP_ENDPOINT);
  if (!endpoint.port || endpoint.pathname !== '/') throw new Error('Invalid AWS HTTP endpoint');
  process.env.HOSTNAME = endpoint.hostname.replace(/^\[|\]$/g, '');
  process.env.PORT = endpoint.port;
}
require('./server.js');

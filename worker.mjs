const API_PREFIX = "/zenvis";
const API_ORIGIN = "https://apisoc.lubinsun.2333123.xyz";

function isApiRequest(pathname) {
  return pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`);
}

function createApiRequest(request) {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(API_ORIGIN);
  upstreamUrl.pathname = incomingUrl.pathname.slice(API_PREFIX.length) || "/";
  upstreamUrl.search = incomingUrl.search;

  const upstreamRequest = new Request(upstreamUrl, request);
  upstreamRequest.headers.set("X-Forwarded-Host", incomingUrl.host);
  upstreamRequest.headers.set("X-Forwarded-Prefix", API_PREFIX);
  upstreamRequest.headers.set("X-Forwarded-Proto", "https");
  return upstreamRequest;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (isApiRequest(url.pathname)) {
      return fetch(createApiRequest(request));
    }

    return env.ASSETS.fetch(request);
  },
};

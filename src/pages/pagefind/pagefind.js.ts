export const prerender = true;

export function GET() {
  return new Response('export const search = () => { return { results: [] } }', {
    headers: {
      'content-type': 'application/javascript'
    }
  });
}
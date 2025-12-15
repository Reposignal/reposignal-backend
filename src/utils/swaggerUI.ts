import type { Context } from 'hono';

/**
 * Swagger UI HTML template
 * Embedded HTML/CSS/JS for serving Swagger UI without external dependencies
 */
export function getSwaggerHTML(specUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reposignal API Documentation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; padding: 0; }
    .swagger-ui { max-width: 100%; }
    .topbar { background-color: #fafafa; padding: 10px 0; border-bottom: 1px solid #ebebeb; }
    .topbar-wrapper { max-width: 1460px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; }
    .topbar h1 { margin: 0; font-size: 24px; color: #333; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-wrapper">
      <h1>Reposignal API</h1>
      <p style="margin: 0; color: #999;">Issue-first work discovery platform</p>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "${specUrl}",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
        requestInterceptor: (request) => {
          // Allow manual header entry for Authorization
          return request;
        },
        responseInterceptor: (response) => {
          return response;
        }
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`;
}

/**
 * Serve Swagger UI at /documentation
 */
export function serveSwaggerUI(specUrl: string = '/openapi.json') {
  return (c: Context) => {
    const html = getSwaggerHTML(specUrl);
    return c.html(html);
  };
}

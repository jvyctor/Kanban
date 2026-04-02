const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
const apiUrl = process.env.API_URL || "http://localhost:3001";

async function get(url) {
  const response = await fetch(url);
  const text = await response.text();
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: text
  };
}

async function main() {
  const [frontend, health, authMe] = await Promise.all([
    get(frontendUrl),
    get(`${apiUrl}/health`),
    get(`${apiUrl}/auth/me`)
  ]);

  const report = {
    frontend: {
      status: frontend.status,
      csp: frontend.headers["content-security-policy"],
      frame: frontend.headers["x-frame-options"]
    },
    apiHealth: {
      status: health.status,
      body: health.body
    },
    authMe: {
      status: authMe.status,
      requestId: authMe.headers["x-request-id"]
    }
  };

  console.log(JSON.stringify(report, null, 2));

  if (frontend.status !== 200 || health.status !== 200 || authMe.status !== 401) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

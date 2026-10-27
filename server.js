const clients = new Set();
const history = [];
const MAX_HISTORY = 50;

function logVerbose(type, message, details = "") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
  if (details) console.log(JSON.stringify(details, null, 2));
}

async function handler(req) {
  const url = new URL(req.url);
  logVerbose("HTTP_REQUEST", `${req.method} request to ${url.pathname}`);

  // 1. Web UI (English)
  if (req.method === "GET" && url.pathname === "/") {
    const historyHtml = history
      .map(data => `
            <div class="card">
                <div class="package">${data.packageName || 'Unknown App'}</div>
                <div class="title">${data.title || 'No Title'}</div>
                <div class="content">${data.content || data.body || ''}</div>
                <div class="time">${new Date(data.when).toLocaleString() || ''}</div>
            </div>
        `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Android Notifications Center</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 600px; margin: 20px auto; padding: 10px; background: #f4f4f9; }
          .card { background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #007acc; position: relative; }
          .title { font-weight: bold; color: #222; margin-top: 3px; }
          .package { font-size: 0.75em; color: #007acc; font-family: monospace; text-transform: lowercase; }
          .content { color: #555; margin-top: 5px; font-size: 0.95em; }
          .time { font-size: 0.75em; color: #888; position: absolute; top: 15px; right: 15px;}
          h2 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
        </style>
      </head>
      <body>
        <h2>Android Notifications Stream</h2>
        <div id="logs">${historyHtml}</div>
        <script>
          const evtSource = new EventSource("/events");
          evtSource.onopen = () => console.log("SSE connection established.");
          evtSource.onerror = (err) => console.error("SSE connection error:", err);
          
          evtSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const logs = document.getElementById("logs");
            const card = document.createElement("div");
            card.className = "card";
            
            card.innerHTML = \`
              <div class="package">\${data.packageName || 'Unknown App'}</div>
              <div class="title">\${data.title || 'No Title'}</div>
              <div class="content">\${data.content || data.body || ''}</div>
              <div class="time">\${(data.when && new Date(data.when).toLocaleString()) || 'unknown_time'}</div>
            \`;
            logs.insertBefore(card, logs.firstChild);
          };
        </script>
      </body>
      </html>
    `;
    return new Response(html, { headers: { "content-type": "text/html; charset=UTF-8" } });
  }

  // 2. SSE Channel
  if (req.method === "GET" && url.pathname === "/events") {
    let controllerRef;

    const stream = new ReadableStream({
      start(controller) {
        controllerRef = controller;
        clients.add(controller);
        logVerbose("SSE_STATUS", `Client connected. Total active clients: ${clients.size}`);
      },
      cancel() {
        // Этот метод может не вызваться вовремя при резком обрыве сокета браузером
        if (controllerRef) clients.delete(controllerRef);
      },
    });

    // Гарантированный триггер: срабатывает сразу, как только HTTP-запрос прерывается (обновление страницы)
    req.signal.addEventListener("abort", () => {
      if (controllerRef) {
        clients.delete(controllerRef);
        logVerbose("SSE_STATUS", `Client disconnected (abort). Total active clients: ${clients.size}`);
      }
    });

    return new Response(stream.pipeThrough(new TextEncoderStream()), {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "connection": "keep-alive",
      },
    });
  }

  // 3. API Endpoint
  if (req.method === "POST" && url.pathname === "/notify") {
    try {
      const body = await req.json();
      logVerbose("API_INBOUND", "Received payload data from Termux", body);

      const processNotification = (item) => {
        const payload = {
          title: item.title,
          content: item.content || item.body,
          packageName: item.packageName,
          when: item.when,
        };

        history.unshift(payload);
        if (history.length > MAX_HISTORY) history.pop();

        const message = `data: ${JSON.stringify(payload)}\n\n`;

        let activeDispatches = 0;
        for (const client of clients) {
          try {
            client.enqueue(message);
            activeDispatches++;
          } catch (err) {
            clients.delete(client);
          }
        }
        logVerbose("SSE_BROADCAST", `Dispatched notification to ${activeDispatches} browser tab(s)`);
      };

      if (Array.isArray(body)) {
        logVerbose("API_PROCESS", `Processing initial batch of ${body.length} notifications`);
        for (let i = body.length - 1; i >= 0; i--) {
          processNotification(body[i]);
        }
      } else {
        logVerbose("API_PROCESS", `Processing single new notification from: ${body.packageName}`);
        processNotification(body);
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      logVerbose("API_ERROR", "Failed to parse or broadcast payload", err.message);
      return new Response("Bad Request", { status: 400 });
    }
  }

  logVerbose("HTTP_ROUTE", `Route not found: ${url.pathname}`);
  return new Response("Not Found", { status: 404 });
}

logVerbose("SERVER_START", "Deno notification server is running on http://localhost:8000");
Deno.serve({ port: 8000 }, handler);

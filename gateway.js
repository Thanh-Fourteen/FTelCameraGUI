import http from 'http';
import HttpProxy from 'http-proxy';

// Tạo proxy server instance
const proxy = HttpProxy.createProxyServer({});

// Tạo server Gateway
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('WebSocket Gateway is running!');
  res.end();
});

// Bắt sự kiện 'upgrade' để xử lý WebSocket
server.on('upgrade', (req, socket, head) => {
  console.log('Incoming URL:', req.url); // Log để kiểm tra

  // --- SỬA Ở ĐÂY ---
  // Regex này có nghĩa: Tìm chữ "/camera/" sau đó lấy nhóm số (\d+) phía sau nó
  const match = req.url.match(/\/camera\/(\d+)/); 
  console.log('Match result:', match);

  if (match && match[1]) {
    const targetPort = match[1]; // Lấy được số 9091
    const targetUrl = `ws://localhost:${targetPort}`;

    console.log(`Connecting: ${req.url} -> ${targetUrl}`);

    // Forward request vào trong localhost
    // Lưu ý: ws: true để báo đây là websocket
    proxy.ws(req, socket, head, { target: targetUrl, ws: true }, (err) => {
      console.error('Proxy Error:', err.message);
      socket.end();
    });
  } else {
    console.log('Invalid URL (Khong tim thay port):', req.url);
    socket.destroy();
  }
});

const GATEWAY_PORT = 8080;
server.listen(GATEWAY_PORT, () => {
  console.log(`Gateway is running on port ${GATEWAY_PORT}`);
});
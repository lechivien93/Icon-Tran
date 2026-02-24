# IconTran - Quick Tunnel Setup (ECONNRESET Workaround)

## ĐƠN GIẢN NHẤT - 2 TERMINALS

### Terminal 1: Start Dev Server
```bash
npx vite dev --port 5173 --host
```

Nếu lỗi, thử:
```bash
npx vite --port 5173
```

hoặc:
```bash
npm run build && npm start
```

### Terminal 2: Start Tunnel
```bash
npx cloudflared tunnel --url http://localhost:5173
```

(Đổi 5173 thành 3000 nếu dùng npm start)

---

## COPY TUNNEL URL

Trong Terminal 2, tìm dòng:
```
...your quick Tunnel: https://random-words.trycloudflare.com
```

Copy URL đó!

---

## UPDATE SHOPIFY PARTNER DASHBOARD

1. Vào: https://partners.shopify.com/
2. Apps → IconTrans → Configuration
3. Update:
   - **App URL**: `https://random-words.trycloudflare.com`
   - **Allowed redirection URL(s)**: `https://random-words.trycloudflare.com/api/auth`
4. Save

---

## TEST APP

1. Vào Shopify Admin: https://admin.shopify.com/store/YOUR_STORE/apps
2. Click "[STAGING] IconTrans"  
3. App should load từ tunnel URL!

---

## TROUBLESHOOTING

**Dev server không start:**
```bash
# Kill processes
lsof -ti:5173 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Try again
npx vite --port 5173
```

**Tunnel không show URL:**
- Wait 10-15 giây
- Check terminal output cho "trycloudflare.com"

**App không load:**
- Verify tunnel URL trong Partner Dashboard
- Check dev server đang chạy (curl http://localhost:5173)

---

## ALTERNATIVE: ngrok (Nếu có)

```bash
# Terminal 1
npm run build && npm start

# Terminal 2
ngrok http 3000
```

URL ổn định hơn cloudflared!

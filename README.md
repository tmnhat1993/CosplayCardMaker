# Cosplay Card Editor – Nekomizu

Công cụ tạo card thông tin sản phẩm cosplay cho thuê, xuất file PNG sẵn đăng mạng.

---

## Cách sử dụng

### 1. Mở file
Mở `cosplay-card-editor.html` bằng bất kỳ trình duyệt nào (Chrome, Edge, Firefox).  
**Không cần server, không cần cài thêm gì.**

---

### 2. Giao diện 2 cột

| Cột trái | Cột phải |
|---|---|
| **Preview card** realtime | **Form nhập liệu** |
| Khung dùng `empty.png` làm nền | Upload ảnh, nhập text |

---

### 3. Upload & chỉnh ảnh

- Click vào vùng upload hoặc **kéo thả ảnh** vào ô upload
- Sau khi upload, ảnh hiện ngay trong khung preview
- **Kéo ảnh** trong khung preview để chọn vùng muốn hiển thị
- **Cuộn chuột** trong khung để zoom in/out
- Dùng **thanh slider** để điều chỉnh scale chính xác hơn
- Bấm **✕ Xóa ảnh** để upload lại

---

### 4. Nhập thông tin sản phẩm

| Trường | Font | Vị trí trong card |
|---|---|---|
| **Tên sản phẩm** | Cinzel (thay Belleta) | Giữa card, khu vực tên |
| **Giá thuê** | Itim Bold | Ngay dưới tên |
| **Chi tiết** | Itim Regular | Hộp dưới cùng |
| **Disclaimer** | Itim Italic – chữ đỏ | Sau chi tiết |
| **Notice** | Alegreya Sans Bold Italic | Cuối card |

> **Xuống dòng**: Nhấn Enter trong textarea, card sẽ tự thêm dòng mới.

---

### 5. Export PNG

- Bấm nút **⬇ Export PNG**
- File xuất ra kích thước **1020 × 1680 px**, nền trắng
- Tên file = tên sản phẩm đã nhập (ví dụ: `MIKU_RASCAL_M.png`)

---

## Tuỳ chỉnh font

Dự án dùng **Cinzel** (Google Fonts) thay cho Belleta vì Belleta là font thương mại.  
Nếu bạn có file font Belleta:

1. Thêm `@font-face` vào **`css/main.css`** (hoặc vào `<head>` trong HTML):
```css
@font-face {
  font-family: 'Belleta';
  src: url('../Belleta.ttf') format('truetype');
}
```

2. Trong **`css/main.css`** tìm và đổi:
```css
/* Tìm: */
font-family: 'Cinzel', Georgia, serif;

/* Đổi thành: */
font-family: 'Belleta', Georgia, serif;
```

---

## Môi trường development

Dự án đã tách thành cấu trúc dev để dễ chỉnh sửa và phát triển tiếp:

```
cosplay-card-editor.html   ← Mở file này để chạy
├── css/
│   └── main.css           ← Style: base, layout 2 cột, card layers, form (theo README)
├── js/
│   └── app.js             ← Logic ES6: upload, pan/zoom, form→preview, export PNG
└── assets/
    ├── logo.png           ← Logo Nekomizu
    └── frame.jpg          ← Khung card (empty.png)
```

- **CSS**: Bố cục và toạ độ text theo đúng phần “Cấu trúc kỹ thuật” bên dưới. Chỉnh style trong `css/main.css`.
- **JS**: Viết ES6 (arrow functions, `const`/`let`, template literals). Chỉnh logic trong `js/app.js`.
- **Chạy**: Mở `cosplay-card-editor.html` bằng trình duyệt (file://). Nếu cần chạy qua HTTP (ví dụ CORS), dùng `npx serve .` hoặc extension Live Server.

---

## Cấu trúc kỹ thuật

```
cosplay-card-editor.html
│
├── assets/frame.jpg   → frame overlay (z-index: 10)
├── assets/logo.png    → logo Nekomizu (z-index: 12)
│
├── #photo-layer       → vùng ảnh người dùng upload (z-index: 1)
│   └── #photo-img     → ảnh với transform: translate + scale
│
├── #txt-name          → overlay text (z-index: 11)
├── #txt-price
├── #txt-detail
├── #txt-disclaimer
├── #txt-notice
│
├── #logo-layer        → logo shop (z-index: 12)
└── #frame-img         → frame phủ lên trên (z-index: 10)
```

### Toạ độ text (đo từ exported.jpg 1020×1680 px)

| Element | top (px) | Ghi chú |
|---|---|---|
| `#txt-name` | 1010 | height: 70px, centered |
| `#txt-price` | 1148 | 2 dòng, line-height: 1.5 |
| `#txt-detail` | 1205 | nhiều dòng, line-height: 1.95 |
| `#txt-disclaimer` | 1455 | chữ đỏ italic |
| `#txt-notice` | 1522 | right: 200px (nhường logo) |
| `#logo-layer` | bottom: 24px right: 64px | 118px wide |

---

## Yêu cầu trình duyệt

- Chrome 90+, Edge 90+, Firefox 85+ ✅
- Safari 14+ ✅
- Không hỗ trợ Internet Explorer ❌

---

## Deploy (bản dist)

Để deploy lên Netlify, Vercel, GitHub Pages hoặc static host bất kỳ:

```bash
npm run build
```

Thư mục **`dist/`** sẽ chứa bản production:
- `index.html` – entry (mở trang chủ là dùng app)
- `css/main.css`, `js/app.js`, `js/debug-panel.js`
- `assets/` – logo, frame

Chỉ cần upload toàn bộ nội dung thư mục **dist/** lên host (hoặc cấu hình build output là `dist`). Xem thử local: `npm run preview:dist` rồi mở http://localhost:3333

---

## File đính kèm

| File / thư mục | Mô tả |
|---|---|
| `cosplay-card-editor.html` | Entry point – mở file này để chạy app |
| `css/main.css` | Toàn bộ style, bố cục theo README |
| `js/app.js` | Logic ES6 (upload, preview, export) |
| `assets/logo.png`, `assets/frame.jpg` | Logo và khung card |
| `README.md` | Tài liệu này |

> Bản standalone 1 file (ảnh nhúng base64): dùng `cosplay-card-editor_2.html` nếu cần chia sẻ một file duy nhất.

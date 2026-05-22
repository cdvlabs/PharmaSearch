# PharmaSearch - Ứng dụng Tra cứu Y khoa & Thuốc Song ngữ (Bilingual & PWA)

PharmaSearch là một ứng dụng web dạng Progressive Web App (PWA) được thiết kế hiện đại nhằm hỗ trợ người dùng và các chuyên gia y tế tra cứu thông tin hoạt chất, biệt dược, triệu chứng và bệnh lý điều trị một cách nhanh chóng, chính xác. Ứng dụng hỗ trợ song ngữ Anh - Việt hoàn chỉnh, hoạt động mượt mà ngay cả khi không có kết nối internet nhờ cơ sở dữ liệu tích hợp sẵn.

---

## ✨ Điểm nổi bật của Dự án

1. **Giao diện hiện đại & Premium**: 
   - Thiết kế theo ngôn ngữ **Material Design 3** của Google kết hợp hiệu ứng chuyển màu sinh động **Neural Expressive Glow**.
   - Mặc định chạy ở **Chủ đề sáng (Light Mode)** sang trọng, tinh tế, độ tương phản cao, tối ưu cho trải nghiệm đọc tài liệu y khoa.
2. **Khả năng hoạt động Ngoại tuyến (Offline First)**:
   - Tích hợp sẵn cơ sở dữ liệu 82 hoạt chất và bệnh lý đã chuẩn hóa và dịch song ngữ Anh - Việt.
   - Tích hợp **Service Worker Cache-First** giúp ứng dụng tải ngay lập tức và chạy ngoại tuyến 100% sau lần truy cập đầu tiên.
3. **Tra cứu Trực tuyến Thời gian thực (Online Mode)**:
   - Tích hợp trực tiếp với API **OpenFDA** từ Cục quản lý Thực phẩm và Dược phẩm Hoa Kỳ khi có kết nối Internet.
   - Tự động dịch động kết quả tìm kiếm trực tuyến sang tiếng Việt ngay tại thiết bị của người dùng.
4. **Cài đặt như Ứng dụng di động (PWA)**:
   - Người dùng có thể dễ dàng cài đặt ứng dụng lên màn hình chính điện thoại hoặc máy tính thông qua biểu tượng cài đặt nhanh trên giao diện.

---

## 📂 Cấu trúc Mã nguồn

```text
PharmaSearch/
├── data/                       # Bộ công cụ ETL & xử lý dữ liệu Python
│   ├── process_data.py         # Script tải dữ liệu OpenFDA, chuẩn hóa & dịch tự động
│   └── translation_cache.json  # Bộ nhớ cache bản dịch giúp tối ưu hóa chi phí API dịch thuật
├── public/                     # Tài nguyên tĩnh phục vụ cho PWA
│   ├── icon.png                # Biểu tượng ứng dụng (512x512)
│   └── manifest.json           # File cấu hình PWA (chủ đề, start URL, biểu tượng)
├── src/                        # Mã nguồn ứng dụng Frontend
│   ├── data/                   # Cơ sở dữ liệu JSON ngoại tuyến
│   │   ├── drugs_db.json       # Cơ sở dữ liệu thuốc song ngữ đã chuẩn hóa
│   │   └── diseases_index.json # Chỉ mục tìm kiếm bệnh lý song ngữ
│   ├── app.js                  # Logic tìm kiếm, tương tác API, chuyển ngữ & Service Worker
│   ├── index.html              # Giao diện HTML5 cấu trúc Semantic
│   └── style.css               # Thiết kế CSS Material Design 3 & hiệu ứng Neural Glow
├── sw.js                       # Service Worker cấu hình lưu bộ nhớ đệm (Cache)
├── DEPLOYMENT.md               # Hướng dẫn triển khai dự án lên Vercel & GitHub Pages
└── README.md                   # Tài liệu giới thiệu dự án (File này)
```

---

## 🚀 Khởi chạy dự án Cục bộ (Local)

Ứng dụng được viết hoàn toàn bằng HTML, CSS và JavaScript thuần túy, không cần các framework phức tạp. Bạn có thể khởi chạy server cục bộ bằng Python:

1. Mở terminal tại thư mục gốc của dự án.
2. Chạy lệnh tạo HTTP Server:
   ```bash
   python -m http.server 8000
   ```
3. Truy cập vào trình duyệt theo địa chỉ: `http://localhost:8000/src/index.html`

---

## 🔄 Cập nhật Cơ sở dữ liệu (Database Maintenance)

Khi cơ sở dữ liệu y khoa từ OpenFDA được cập nhật mới hoặc bạn muốn bổ sung dữ liệu:

1. Đảm bảo bạn đã cài đặt Python 3 và các thư viện cần thiết.
2. Chạy script xử lý dữ liệu để cập nhật tệp dữ liệu tĩnh mới:
   ```bash
   python data/process_data.py
   ```
3. Đẩy (push) các tệp tin `src/data/drugs_db.json` và `src/data/diseases_index.json` vừa được tạo lại lên GitHub.
4. Mở file [sw.js](file:///d:/python/science_skills_drug_lookup/sw.js) và tăng số phiên bản `CACHE_NAME` (ví dụ từ `pharmasearch-v4` lên `pharmasearch-v5`) để kích hoạt quá trình cập nhật bộ nhớ cache trên trình duyệt người dùng.

---

## 🛠️ Triển khai ứng dụng (Deployment)

Vui lòng xem hướng dẫn chi tiết từng bước triển khai ứng dụng miễn phí lên **Vercel** hoặc **GitHub Pages** trong tệp [DEPLOYMENT.md](file:///d:/python/science_skills_drug_lookup/DEPLOYMENT.md).

---
*Phát triển và phân phối dưới dạng mã nguồn mở phi thương mại.*

# PharmaSearch - Ứng dụng Tra cứu Y khoa & Thuốc

PharmaSearch là một ứng dụng web dạng Progressive Web App (PWA) được thiết kế hiện đại nhằm hỗ trợ người dùng và các chuyên gia y tế tra cứu thông tin hoạt chất, biệt dược, triệu chứng và bệnh lý điều trị một cách nhanh chóng, chính xác. Ứng dụng hỗ trợ song ngữ Anh - Việt hoàn chỉnh, hoạt động mượt mà ngay cả khi không có kết nối internet nhờ cơ sở dữ liệu tích hợp sẵn.

---

## ✨ Điểm nổi bật của Dự án

1. **Giao diện hiện đại & Premium**: 
   - Thiết kế theo ngôn ngữ **Material Design 3** của Google kết hợp hiệu ứng chuyển màu sinh động **Neural Expressive Glow**.
   - Mặc định chạy ở **Chủ đề sáng (Light Mode)** sang trọng, tinh tế, độ tương phản cao, tối ưu cho trải nghiệm đọc tài liệu y khoa.
2. **Tải trang nhanh & Lưu trữ ngoại tuyến (PWA Offline Cache)**:
   - Tích hợp **Service Worker Cache-First** giúp lưu bộ nhớ đệm toàn bộ giao diện và từ điển bệnh lý tĩnh Anh-Việt, giúp tải ứng dụng tức thì sau lần truy cập đầu tiên.
   - Việc tra cứu thông tin chi tiết thuốc được thực hiện trực tuyến thời gian thực với API OpenFDA để đảm bảo dữ liệu luôn cập nhật mới nhất.
3. **Tra cứu Trực tuyến Thời gian thực (Online Mode)**:
   - Tích hợp trực tiếp với API **OpenFDA** từ Cục quản lý Thực phẩm và Dược phẩm Hoa Kỳ khi có kết nối Internet.
   - Tự động dịch động kết quả tìm kiếm trực tuyến sang tiếng Việt ngay tại thiết bị của người dùng.
4. **Cài đặt như Ứng dụng di động (PWA)**:
   - Người dùng có thể dễ dàng cài đặt ứng dụng lên màn hình chính điện thoại hoặc máy tính thông qua biểu tượng cài đặt nhanh trên giao diện.

---

## 📂 Cấu trúc Mã nguồn

```text
PharmaSearch/
├── drugs/                      # Thư mục chứa 13 file JSON nhãn thuốc FDA (.gitignore)
├── public/                     # Tài nguyên tĩnh phục vụ cho PWA
│   ├── icon.png                # Biểu tượng ứng dụng (512x512)
│   └── manifest.json           # File cấu hình PWA (chủ đề, start URL, biểu tượng)
├── src/                        # Mã nguồn ứng dụng Frontend
│   ├── data/                   # Cơ sở dữ liệu JSON ngoại tuyến
│   │   └── disease_dictionary.json # Từ điển bệnh lý song ngữ tĩnh Anh-Việt
│   ├── app.js                  # Logic tìm kiếm, tương tác API, chuyển ngữ & Service Worker
│   ├── index.html              # Giao diện HTML5 cấu trúc Semantic
│   └── style.css               # Thiết kế CSS Material Design 3 & hiệu ứng Neural Glow
├── tests/                      # Thư mục kiểm thử chất lượng
│   └── test_assets.py          # Script python chạy kiểm thử
├── extract_and_translate_diseases.py # Script trích xuất và dịch tự động các từ khóa bệnh lý từ drugs/
├── sw.js                       # Service Worker cấu hình lưu bộ nhớ đệm (Cache)
├── run_tests.bat               # File chạy kiểm thử nhanh trên Windows
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
2. Bạn có thể sử dụng công cụ trích xuất bệnh tự động từ 13 file JSON nhãn thuốc trong thư mục `drugs/` và tự động dịch qua Google Translate để cập nhật vào từ điển bệnh lý:
   ```bash
   python extract_and_translate_diseases.py
   ```
   *Lưu ý: Script sẽ tự động stream dữ liệu qua từng dòng để tối ưu RAM (chỉ tốn vài MB thay vì load toàn bộ file 8.5 GB), lọc bỏ các từ khóa rác và dịch tự động các bệnh lý phổ biến chưa có trong từ điển.*
3. Mở file [sw.js](file:///d:/python/science_skills_drug_lookup/sw.js) và tăng số phiên bản `CACHE_NAME` (ví dụ từ `pharmasearch-v12` lên `pharmasearch-v13`) để kích hoạt quá trình cập nhật bộ nhớ cache trên trình duyệt người dùng.

---
*Phát triển và phân phối dưới dạng mã nguồn mở phi thương mại.*

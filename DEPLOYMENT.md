# Hướng dẫn Triển khai PharmaSearch (Miễn phí 100% & Vĩnh viễn)

Tài liệu này hướng dẫn chi tiết từng bước từ cách tải mã nguồn lên **GitHub** cho đến triển khai trang web hoạt động trực tuyến qua hai nền tảng hosting tĩnh miễn phí hàng đầu: **GitHub Pages** và **Vercel**. 

Mã nguồn của chúng ta đã được cấu hình đường dẫn tương đối, bảo đảm chạy hoàn hảo PWA (Progressive Web App) ngay cả trong thư mục con của GitHub Pages.

---

## 📦 Bước 1: Đẩy (Push) mã nguồn lên GitHub

Để triển khai được lên GitHub Pages hay Vercel, mã nguồn của bạn cần phải nằm trên một kho lưu trữ (Repository) của GitHub. Hãy làm theo các bước chi tiết sau:

### 1. Tạo Repository mới trên GitHub:
1. Truy cập vào [GitHub.com](https://github.com/) và đăng nhập tài khoản của bạn.
2. Tại góc trên cùng bên phải, nhấn vào dấu **`+`** và chọn **New repository** (hoặc truy cập trực tiếp [github.com/new](https://github.com/new)).
3. Cấu hình các thông số sau:
   - **Repository owner**: Tài khoản của bạn.
   - **Repository name**: Nhập chính xác `PharmaSearch`.
   - **Description**: (Không bắt buộc) Ví dụ: *Ứng dụng tra cứu y khoa và thuốc song ngữ Anh-Việt chạy ngoại tuyến.*
   - **Choose visibility**: Chọn **Public** (Công khai - Bắt buộc nếu muốn dùng GitHub Pages miễn phí).
   - **Mục Initialize this repository with**:
     - ⚠️ **QUAN TRỌNG**: **KHÔNG** tích chọn vào ô *Add a README file*, *Add .gitignore*, hoặc *Choose a license*. Do thư mục dự án cục bộ của chúng ta đã có đầy đủ các file này rồi (bao gồm một file `README.md` chất lượng cao đã soạn sẵn). Nếu bạn tích chọn ở đây sẽ gây ra xung đột lịch sử git khi đẩy code.
4. Nhấn nút **Create repository** ở dưới cùng.

### 2. Thực hiện đẩy mã nguồn từ máy tính lên GitHub:
Mở Terminal hoặc PowerShell tại thư mục dự án cục bộ (`science_skills_drug_lookup`) và chạy tuần tự các lệnh sau:

1. **Khởi tạo môi trường git cục bộ (nếu chưa có)**:
   ```bash
   git init
   ```
2. **Thêm toàn bộ các file dự án vào danh sách theo dõi**:
   ```bash
   git add .
   ```
3. **Commit mã nguồn lần đầu**:
   ```bash
   git commit -m "Khởi tạo mã nguồn PharmaSearch song ngữ"
   ```
4. **Đổi tên nhánh mặc định thành `main`**:
   ```bash
   git branch -M main
   ```
5. **Liên kết thư mục cục bộ với repository trên GitHub**:
   *(Hãy thay thế `<ten-tai-khoan-github>` bằng tên đăng nhập GitHub thực tế của bạn)*
   ```bash
   git remote add origin https://github.com/<ten-tai-khoan-github>/PharmaSearch.git
   ```
6. **Đẩy mã nguồn lên GitHub**:
   ```bash
   git push -u origin main
   ```

Sau khi chạy xong, hãy tải lại trang GitHub để thấy toàn bộ các file cùng tệp `README.md` hiển thị đẹp mắt ngay tại trang chủ repo của bạn.

---

## ⚡ Bước 2: Triển khai trực tuyến lên các dịch vụ hosting

Sau khi code đã nằm trên GitHub, bạn chọn một trong hai phương án sau để đưa trang web lên internet.

### 🟢 Phương án A: Triển khai lên Vercel (Tối ưu & Khuyên dùng)
Vercel là nền tảng hosting Frontend tốt nhất hiện nay, tự động deploy lại mỗi khi bạn thực hiện cập nhật code trên GitHub.

1. Truy cập [Vercel](https://vercel.com/) và đăng nhập bằng tài khoản GitHub của bạn.
2. Tại màn hình Dashboard, click vào **Add New** > **Project**.
3. Tại danh sách các repository của bạn hiện ra, tìm `PharmaSearch` và bấm **Import**.
4. Cấu hình dự án (để mặc định):
   - **Framework Preset**: Chọn `Other` (vì đây là ứng dụng HTML/JS tĩnh thuần).
   - **Root Directory**: Để mặc định `./`.
   - **Build and Output Settings**: Giữ nguyên không thay đổi.
5. Nhấn nút **Deploy**.
6. Chờ khoảng 30 giây, dự án sẽ hoàn tất. Vercel sẽ cấp cho bạn một tên miền miễn phí có định dạng: `https://pharmasearch-xxxx.vercel.app`.

> [!TIP]
> Do Vercel chạy ở cấp Root Domain, Service Worker của ứng dụng sẽ kích hoạt ngay lập tức mà không gặp bất kỳ trở ngại nào.

---

### 🔵 Phương án B: Triển khai lên GitHub Pages (Đơn giản, đi kèm repo)
GitHub Pages cho phép bạn phát hành trang web trực tiếp từ chính repository chứa code của bạn.

1. Truy cập vào trang repository `PharmaSearch` của bạn trên GitHub.
2. Click vào thẻ **Settings** (Cài đặt) ở thanh menu trên cùng.
3. Ở menu điều hướng bên trái, cuộn xuống phần *Code and automation* và chọn **Pages**.
4. Tại mục **Build and deployment**:
   - **Source**: Chọn `Deploy from a branch`.
   - **Branch**: Chọn nhánh `main` và thư mục `/ (root)`.
   - Nhấn **Save**.
5. Chờ khoảng 1-2 phút, tải lại trang Cài đặt Pages này. Bạn sẽ thấy một banner màu xanh lá chứa đường dẫn trang web trực tuyến có định dạng:
   `https://<ten-tai-khoan-github>.github.io/PharmaSearch/`

---

## 🛠️ Những lưu ý quan trọng để chạy PWA ổn định

### 1. Cơ chế hoạt động của Service Worker trên GitHub Pages
Do GitHub Pages triển khai ứng dụng của bạn dưới dạng một thư mục con (`/PharmaSearch/`), cấu trúc mã nguồn của PharmaSearch đã được tôi tối ưu hóa bằng cách:
- Sử dụng liên kết tương đối `../public/manifest.json` trong file `src/index.html`.
- Gọi file service worker tương đối `../sw.js` từ `src/app.js` để trình duyệt tự nhận dạng scope `/PharmaSearch/`.
- Mảng tài nguyên lưu trữ cache tĩnh trong `sw.js` đã loại bỏ dấu gạch chéo đầu dòng (`/`) để không truy vấn sai về thư mục gốc của máy chủ GitHub Pages.

### 2. Kích hoạt cập nhật dữ liệu và giao diện mới
Trình duyệt cài đặt PWA sẽ lưu cache rất chặt theo cấu hình trong `sw.js`. Khi bạn sửa đổi bất kỳ tệp tin HTML, CSS, JS hoặc JSON dữ liệu nào, hãy nhớ:
1. Mở file [sw.js](file:///d:/python/science_skills_drug_lookup/sw.js) cục bộ.
2. Thay đổi giá trị biến `CACHE_NAME` ở dòng 1 (ví dụ: đổi từ `'pharmasearch-v4'` thành `'pharmasearch-v5'`).
3. Commit và push thay đổi lên GitHub.
Trình duyệt của người dùng sẽ nhận biết sự thay đổi này, tải lại các file mới trong nền và áp dụng giao diện/dữ liệu mới ở lần mở ứng dụng tiếp theo.

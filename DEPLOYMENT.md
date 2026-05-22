# Hướng dẫn Triển khai PharmaSearch (Miễn phí 100% & Vĩnh viễn)

Tài liệu này hướng dẫn chi tiết từng bước từ cách đẩy mã nguồn lên **GitHub** cho đến triển khai trang web hoạt động trực tuyến qua hai nền tảng hosting tĩnh miễn phí hàng đầu: **GitHub Pages** và **Vercel**. 

Mã nguồn đã được cấu hình đường dẫn tương đối, đảm bảo chạy hoàn hảo PWA (Progressive Web App) ngay cả trong thư mục con của GitHub Pages.

---

## 📦 Bước 1: Đẩy (Push) mã nguồn lên GitHub

### Repository đích
```
https://github.com/cdvlabs/PharmaSearch
```

### Cách lấy Personal Access Token (PAT)

Để push lên repository của organization `cdvlabs`, bạn cần tạo **Personal Access Token**:

1. Truy cập: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Đặt tên token (ví dụ: `PharmaSearch Deploy`)
4. Chọn thời hạn token
5. Tick chọn quyền: **`repo`** (Full control of private repositories)
6. Click **"Generate token"** → copy token (chỉ hiển thị 1 lần duy nhất)

> [!IMPORTANT]
> Token phải được tạo từ tài khoản là **thành viên (member)** của organization `cdvlabs` và có quyền `write` trên repository.

### Các lệnh push (chạy trong PowerShell tại thư mục dự án)

```bash
# 1. Thêm remote (nếu chưa có)
git remote add origin https://github.com/cdvlabs/PharmaSearch.git

# 2. Push với token xác thực
# Thay <TOKEN> bằng token thực tế bạn vừa tạo
git push https://cdvlabs:<TOKEN>@github.com/cdvlabs/PharmaSearch.git main

# Hoặc push lại nếu đã add remote
git push -u origin main
# (Khi hỏi username/password: nhập tên user GitHub và token làm password)
```

### Cập nhật sau khi sửa code

```bash
git add -A
git commit -m "Mô tả thay đổi"
git push
```

---

## ⚡ Bước 2: Triển khai trực tuyến lên các dịch vụ hosting

Sau khi code đã nằm trên GitHub, chọn một trong hai phương án sau:

### 🟢 Phương án A: Triển khai lên Vercel (Tối ưu & Khuyên dùng)

Vercel tự động deploy lại mỗi khi bạn push code lên GitHub.

1. Truy cập [Vercel](https://vercel.com/) → Đăng nhập bằng tài khoản GitHub
2. Click **Add New** > **Project**
3. Trong danh sách repository, tìm `cdvlabs/PharmaSearch` → **Import**
4. Cấu hình:
   - **Framework Preset**: Chọn `Other`
   - **Root Directory**: `./`
   - **Build Command**: để trống
   - **Output Directory**: `src`
5. Click **Deploy**
6. Chờ ~30 giây → nhận URL miễn phí: `https://pharmasearch-xxxx.vercel.app`

> [!TIP]
> Vercel chạy ở root domain nên Service Worker và PWA hoạt động hoàn hảo ngay lập tức.

---

### 🔵 Phương án B: Triển khai lên GitHub Pages

1. Vào tab **Settings** của repo `cdvlabs/PharmaSearch`
2. Menu trái → **Pages** (mục *Code and automation*)
3. Tại **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` | Thư mục: `/ (root)`
   - Click **Save**
4. Chờ 1-2 phút → URL: `https://cdvlabs.github.io/PharmaSearch/`

> [!NOTE]
> Với GitHub Pages, truy cập đúng đường dẫn: `https://cdvlabs.github.io/PharmaSearch/src/index.html` để vào ứng dụng. Hoặc thêm trang redirect `index.html` ở root.

---

## 🔄 Bước 3: Cập nhật dữ liệu thuốc từ OpenFDA

Để tải lại dữ liệu mới nhất từ FDA (khi có thuốc mới hoặc cập nhật nhãn thuốc):

```bash
# Chạy ETL pipeline (cần Python + kết nối internet)
$env:PYTHONIOENCODING="utf-8"
python data/process_data.py
```

Sau khi chạy xong, commit và push file `src/data/drugs_db.json` và `src/data/diseases_index.json` mới lên GitHub. Vercel/GitHub Pages sẽ tự động cập nhật.

---

## 🛠️ Lưu ý quan trọng để PWA hoạt động ổn định

### Service Worker và Cache

Khi bạn sửa đổi bất kỳ file nào (HTML, CSS, JS, JSON), **bắt buộc** phải tăng phiên bản cache:

1. Mở file [sw.js](sw.js)
2. Tìm biến `CACHE_NAME` ở dòng đầu
3. Đổi ví dụ từ `'pharmasearch-v4'` thành `'pharmasearch-v5'`
4. Commit và push lên GitHub

Người dùng sẽ tự động nhận phiên bản mới trong lần mở app tiếp theo.

### Cấu trúc đường dẫn tương đối

PharmaSearch sử dụng đường dẫn tương đối thay vì tuyệt đối để tương thích với mọi subdirectory:
- `../public/manifest.json` trong `src/index.html`
- `../sw.js` từ `src/app.js`
- Không dùng `/` ở đầu đường dẫn trong `sw.js`

---

## ✅ Kiểm tra sau triển khai

Sau khi deploy thành công, hãy kiểm tra:

- [ ] Trang web mở được và hiển thị giao diện đúng
- [ ] Tìm kiếm offline hoạt động (thử tìm "GERD", "hypertension", "diabetes")
- [ ] Chuyển đổi ngôn ngữ Anh/Việt hoạt động
- [ ] Selector Chips hiển thị khi có nhiều thuốc
- [ ] Accordion mở/đóng đúng (Mô tả, Cách dùng, Cảnh báo)
- [ ] PWA có thể cài đặt về điện thoại (nút "📲 Cài đặt")

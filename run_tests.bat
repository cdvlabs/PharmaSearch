@echo off
echo [INFO] Dang chay bo kiem tra chat luong PharmaSearch...
python tests/test_assets.py
if errorlevel 1 (
    echo [ERROR] Kiem thu that bai! Vui long sua lai code.
    exit /b 1
)
echo [SUCCESS] Toan bo kiem thu thanh cong tot dep!
exit /b 0

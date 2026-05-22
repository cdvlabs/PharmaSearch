# -*- coding: utf-8 -*-
import os
import json
import sys

def test_json_files():
    """Kiem tra tinh hop le cu phap cua tat ca cac tep JSON trong du an."""
    json_files = [
        "src/data/disease_dictionary.json",
        "public/manifest.json"
    ]
    
    print("=== BAT DAU KIEM TRA CU PHAP JSON ===")
    for file_path in json_files:
        if not os.path.exists(file_path):
            print(f"[THAT BAI] File khong ton tai: {file_path}")
            return False
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                json.load(f)
            print(f"[THANH CONG] File JSON hop le: {file_path}")
        except json.JSONDecodeError as e:
            print(f"[THAT BAI] Loi cu phap JSON trong file {file_path}: {str(e)}")
            return False
    return True

def test_essential_assets():
    """Kiem tra su ton tai cua cac tep tin tai nguyen tinh quan trong."""
    assets = [
        "src/index.html",
        "src/style.css",
        "src/app.js",
        "sw.js",
        "public/icon.png"
    ]
    
    print("\n=== BAT DAU KIEM TRA TAI NGUYEN TINH ===")
    for asset in assets:
        if os.path.exists(asset):
            size = os.path.getsize(asset)
            print(f"[THANH CONG] Tim thay asset: {asset} ({size} bytes)")
        else:
            print(f"[THAT BAI] Thieu asset quan trong: {asset}")
            return False
    return True

def test_relative_paths():
    """Dam bao khong con duong dan tuyet doi huong ve root domain trong code de tuong thich GitHub Pages."""
    checks = [
        ("src/index.html", ['="/public/', "='/public/"]),
        ("src/app.js", ['="/sw.js"', "='/sw.js'", '="/src/data/', "='/src/data/"]),
        ("sw.js", ["'/src/", '"/src/', "'/public/", '"/public/'])
    ]
    
    print("\n=== BAT DAU KIEM TRA DUONG DAN TUONG DOI ===")
    for file_path, forbidden_patterns in checks:
        if not os.path.exists(file_path):
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        for pattern in forbidden_patterns:
            if pattern in content:
                print(f"[THAT BAI] Phat hien duong dan tuyet doi '{pattern}' trong file: {file_path}")
                return False
        print(f"[THANH CONG] File hop le (khong chua duong dan tuyet doi goc): {file_path}")
    return True

if __name__ == "__main__":
    success = True
    if not test_json_files():
        success = False
    if not test_essential_assets():
        success = False
    if not test_relative_paths():
        success = False
        
    print("\n=== KET QUA KIEM THU ===")
    if success:
        print("[OK] Toan bo he thong hoat dong on dinh va san sang trien khai!")
        sys.exit(0)
    else:
        print("[ERROR] Kiem thu that bai. Vui long kiem tra lai cau hinh!")
        sys.exit(1)

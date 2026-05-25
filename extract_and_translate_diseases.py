import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from collections import Counter

# Đảm bảo in UTF-8 trên Windows console
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def translate_to_vietnamese(text: str) -> str:
    """Dịch cụm từ tiếng Anh sang tiếng Việt qua Google Translate API miễn phí có cơ chế retry."""
    if not text.strip():
        return ""
    
    retries = 3
    for attempt in range(retries):
        try:
            url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=" + urllib.parse.quote(text)
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                translated = ""
                if data and data[0]:
                    for chunk in data[0]:
                        if chunk and chunk[0]:
                            translated += chunk[0]
                return translated.strip()
        except Exception as e:
            if attempt < retries - 1:
                print(f"\n[Cảnh báo] Lỗi dịch lần {attempt+1} cho '{text}': {e}. Đang thử lại...")
                time.sleep(5.0) # Đợi 5 giây trước khi thử lại
            else:
                print(f"\n[Lỗi] Không thể dịch '{text}' sau {retries} lần thử: {e}")
                return ""
    return ""

def is_valid_disease(phrase: str) -> bool:
    """Lọc bỏ thông minh các cụm từ không phải là bệnh lý thực sự."""
    words = phrase.split()
    if not words:
        return False
        
    # Danh sách các từ dừng/từ rác y khoa phổ biến
    invalid_single_words = {
        'women', 'men', 'adult', 'adults', 'children', 'pediatric', 'adolescents', 'adolescent',
        'patients', 'patient', 'subject', 'subjects', 'doctor', 'physician', 'hospital',
        'under', 'above', 'below', 'after', 'before', 'during', 'following', 'caused', 'due',
        'reduce', 'reduces', 'reducing', 'prevent', 'prevents', 'preventing', 'treatment', 'treatments',
        'therapy', 'therapies', 'dose', 'doses', 'dosing', 'administration', 'use', 'uses',
        'clinical', 'safety', 'efficacy', 'response', 'week', 'weeks', 'day', 'days', 'month',
        'months', 'year', 'years', 'group', 'groups', 'percent', 'percentage', 'active', 'moderate',
        'severe', 'mild', 'acute', 'chronic', 'trivial', 'occasional', 'certain', 'including',
        'include', 'includes', 'highly', 'susceptible', 'resistant', 'tolerant', 'intoxication',
        'combination', 'monotherapy', 'adjunct', 'adjunctive', 'palliative', 'temporary', 'temporarily',
        'local', 'systemic', 'general', 'generalized', 'regional', 'peripheral', 'central',
        'established', 'diagnosed', 'suspected', 'confirmed', 'indicated', 'prescribed', 'label',
        'mg', 'ml', 'tablet', 'tablets', 'capsule', 'capsules', 'injection', 'injections', 'vial', 'vials',
        'these', 'those', 'other', 'another', 'some', 'any', 'all', 'every', 'each', 'none',
        'greater', 'less', 'equal', 'weighing', 'weight', 'loss', 'gain', 'management', 'control',
        'prevention', 'prophylaxis', 'relief', 'reduction', 'improvement', 'maintenance', 'healing',
        'stage', 'grade', 'grades', 'types', 'type', 'form', 'forms', 'class', 'classes', 'strains',
        'organism', 'organisms', 'microorganism', 'microorganisms', 'virus', 'viruses',
        'bacterial', 'fungal', 'viral', 'infectious', 'non-infectious', 'complicated', 'uncomplicated',
        'related', 'associated', 'defined', 'resulting', 'occurring', 'who', 'whose', 'whom', 'where',
        'which', 'that', 'than', 'as', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'and', 'or', 'a', 'an', 'the'
    }
    
    # Nếu là từ đơn và nằm trong danh sách rác hoặc quá ngắn
    if len(words) == 1:
        if words[0] in invalid_single_words or len(words[0]) <= 3:
            # Giữ lại các trường hợp đặc biệt như pain, gout...
            if words[0] not in {'pain', 'gout', 'acne', 'scabies', 'flu', 'cough', 'fever'}:
                return False
        return True
            
    # Lọc các cụm từ chứa quá nhiều từ rác hoặc không mang nghĩa bệnh lý (áp dụng từ 2 từ trở lên)
    garbage_count = sum(1 for w in words if w in invalid_single_words)
    if garbage_count >= len(words) - 1:
        return False
            
    return True

def clean_phrase(phrase: str) -> str:
    """Dọn dẹp cụm từ tiếng Anh, loại bỏ khoảng trắng và từ dừng không mong muốn ở đầu/cuối."""
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'in', 'with', 'for', 'of', 'to', 'at', 'by',
        'patients', 'adults', 'children', 'pediatric', 'symptoms', 'infections',
        'signs', 'clinical', 'disease', 'diseases', 'conditions', 'therapy', 'treatment',
        'active', 'moderate', 'severe', 'mild', 'acute', 'chronic', 'use', 'only',
        'indicated', 'injection', 'tablets', 'capsules', 'dose', 'daily', 'first'
    }
    
    phrase = " ".join(phrase.split()).lower()
    words = phrase.split()
    
    if not words:
        return ""
        
    while words and (words[0] in stop_words or len(words[0]) <= 2):
        words.pop(0)
    while words and (words[-1] in stop_words or len(words[-1]) <= 2):
        words.pop()
        
    clean_p = " ".join(words)
    
    # Kiểm tra tính hợp lệ của cụm từ
    if not clean_p or len(clean_p) < 3 or len(words) > 4:
        return ""
        
    # Loại bỏ nếu chứa số
    if any(char.isdigit() for char in clean_p):
        return ""
        
    if not is_valid_disease(clean_p):
        return ""
        
    return clean_p

def main():
    drugs_dir = "d:/python/science_skills_drug_lookup/drugs"
    dict_path = "d:/python/science_skills_drug_lookup/src/data/disease_dictionary.json"
    
    if not os.path.exists(drugs_dir):
        print(f"[Lỗi] Thư mục chứa thuốc không tồn tại: {drugs_dir}")
        return
        
    files = [f for f in os.listdir(drugs_dir) if f.endswith('.json')]
    files.sort()
    
    if not files:
        print(f"[Cảnh báo] Không tìm thấy file JSON nào trong thư mục: {drugs_dir}")
        return
        
    print(f"Tìm thấy {len(files)} file JSON trong thư mục 'drugs'.")
    
    patterns = [
        re.compile(r'\btreatment of\s+([a-zA-Z\s-]{3,60})', re.IGNORECASE),
        re.compile(r'\bprevention of\s+([a-zA-Z\s-]{3,60})', re.IGNORECASE),
        re.compile(r'\bprophylaxis of\s+([a-zA-Z\s-]{3,60})', re.IGNORECASE),
        re.compile(r'\bmanagement of\s+([a-zA-Z\s-]{3,60})', re.IGNORECASE),
        re.compile(r'\bindicated for the treatment of\s+([a-zA-Z\s-]{3,60})', re.IGNORECASE),
        re.compile(r'\bindicated for\s+([a-zA-Z\s-]{3,60})', re.IGNORECASE),
        re.compile(r'\bto treat\s+([a-zA-Z\s-]{3,60})', re.IGNORECASE),
        re.compile(r'\bhelps prevent\s+([a-zA-Z\s-]{3,60})', re.IGNORECASE),
        re.compile(r'\brelief of\s+([a-zA-Z\s-]{3,60})', re.IGNORECASE),
    ]
    
    disease_counter = Counter()
    total_records = 0
    
    # Đọc stream từng file
    start_time = time.time()
    for idx, filename in enumerate(files):
        file_path = os.path.join(drugs_dir, filename)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        print(f"[{idx+1}/{len(files)}] Đang quét file {filename} ({file_size_mb:.1f} MB)...")
        
        buffer = []
        in_results = False
        brace_level = 0
        file_records = 0
        
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if '"results": [' in line:
                    in_results = True
                    continue
                
                if not in_results:
                    continue
                    
                buffer.append(line)
                brace_level += line.count('{') - line.count('}')
                
                if brace_level == 0 and buffer:
                    item_str = "".join(buffer).strip()
                    if item_str.endswith(','):
                        item_str = item_str[:-1]
                    try:
                        item = json.loads(item_str)
                        file_records += 1
                        total_records += 1
                        
                        # Trích xuất từ indications_and_usage
                        if "indications_and_usage" in item and item["indications_and_usage"]:
                            text = item["indications_and_usage"][0]
                            for pattern in patterns:
                                matches = pattern.findall(text)
                                for m in matches:
                                    cleaned = clean_phrase(m)
                                    if cleaned:
                                        disease_counter[cleaned] += 1
                    except Exception:
                        pass
                    buffer = []
        
        print(f" -> Hoàn thành file {filename}. Đã quét {file_records} records.")
        
    scan_duration = time.time() - start_time
    print(f"\nQuét xong! Tổng số records: {total_records} trong {scan_duration:.1f} giây.")
    print(f"Tổng số cụm từ bệnh lý trích xuất được (chưa lọc trùng): {len(disease_counter)}")
    
    # Ngưỡng xuất hiện tối thiểu để giữ lại bệnh
    min_count = 1
    filtered_diseases = [d for d, count in disease_counter.items() if count >= min_count]
    filtered_diseases.sort(key=lambda x: disease_counter[x], reverse=True)
    
    print(f"Số lượng bệnh có tần suất xuất hiện >= {min_count} lần: {len(filtered_diseases)}")
    
    # Đọc từ điển hiện tại
    existing_dict = {}
    if os.path.exists(dict_path):
        try:
            with open(dict_path, 'r', encoding='utf-8') as f:
                existing_dict = json.load(f)
            print(f"Đã nạp từ điển hiện tại với {len(existing_dict)} mục.")
        except Exception as e:
            print(f"Lỗi khi đọc từ điển cũ: {e}. Sẽ tạo mới.")
            
    # Lọc ra các bệnh tiếng Anh chưa có trong từ điển
    existing_english_diseases = set()
    for key, val in existing_dict.items():
        existing_english_diseases.add(val.lower())
        if key.isascii():
            existing_english_diseases.add(key.lower())
            
    new_diseases = [d for d in filtered_diseases if d.lower() not in existing_english_diseases]
    
    # Giới hạn số lượng dịch tối đa
    max_translate = 600
    to_translate = new_diseases[:max_translate]
    
    print(f"Phát hiện {len(new_diseases)} bệnh mới chưa có trong từ điển. Tiến hành dịch tối đa {len(to_translate)} bệnh.")
    
    # Bắt đầu dịch
    translated_count = 0
    
    for i, eng_disease in enumerate(to_translate):
        freq = disease_counter[eng_disease]
        print(f"[{i+1}/{len(to_translate)}] Đang dịch '{eng_disease}' (tần suất: {freq})... ", end="")
        sys.stdout.flush()
        
        vi_disease = translate_to_vietnamese(eng_disease)
        if vi_disease:
            vi_disease_clean = vi_disease.lower().strip()
            print(f"-> '{vi_disease_clean}'")
            
            # Đọc lại từ điển để đồng bộ và cập nhật tích lũy ngay lập tức
            current_dict = {}
            if os.path.exists(dict_path):
                try:
                    with open(dict_path, 'r', encoding='utf-8') as f:
                        current_dict = json.load(f)
                except Exception:
                    current_dict = existing_dict.copy()
            else:
                current_dict = existing_dict.copy()
            
            # Thêm vào từ điển mới
            current_dict[vi_disease_clean] = eng_disease
            current_dict[eng_disease] = eng_disease
            translated_count += 1
            
            # Ghi đè cập nhật vào file từ điển ngay sau mỗi từ
            try:
                with open(dict_path, 'w', encoding='utf-8') as f:
                    json.dump(current_dict, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"[Lỗi] Không thể ghi file từ điển: {e}")
            
            # Nghỉ ngơi giãn cách lớn (2.5 giây) tránh bị Google chặn
            time.sleep(2.5)
        else:
            print("Thất bại hoặc bị dừng")
            # Nếu dịch thất bại liên tiếp (có thể do bị chặn IP), dừng chương trình để bảo vệ IP
            if i > 5 and translated_count == 0:
                print("[Cảnh báo] Bị Google chặn dịch tạm thời. Tạm dừng dịch.")
                break
            
    print(f"\n[Hoàn thành] Đã cập nhật xong từ điển tại {dict_path}. Dịch thành công {translated_count} từ mới.")

if __name__ == "__main__":
    main()

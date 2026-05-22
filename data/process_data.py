# -*- coding: utf-8 -*-
"""
Chương trình tiền xử lý dữ liệu (ETL Pipeline) tự động hóa cho PharmaSearch.
Tự động gọi API OpenFDA để tải dữ liệu nhãn thuốc cho 30 hoạt chất thiết yếu,
sử dụng từ điển ánh xạ để chuyển dịch bệnh lý y học sang tiếng Việt và tạo chỉ mục ngược.
"""

import json
import os
import urllib.request
import urllib.parse
import time
from typing import Dict, List, Any, Set, Tuple

# Định nghĩa kiểu dữ liệu cho Type Hints
DrugInfo = Dict[str, Any]
Dataset = List[DrugInfo]
InvertedIndex = Dict[str, List[Dict[str, Any]]]

# 1. Danh sách 83 hoạt chất thiết yếu thông dụng nhất tại Việt Nam cần tải dữ liệu
ESSENTIAL_DRUGS: List[str] = [
    # Giảm đau, hạ sốt, kháng viêm, trị Gút
    "paracetamol", "ibuprofen", "colchicine", "allopurinol", "febuxostat",
    "meloxicam", "aspirin", "celecoxib", "etoricoxib", "diclofenac", "naproxen",
    # Kháng sinh, kháng virus, kháng nấm
    "amoxicillin", "ciprofloxacin", "cefuroxime", "cefixime", "cephalexin",
    "azithromycin", "clarithromycin", "metronidazole", "acyclovir", "oseltamivir",
    "fluconazole", "ketoconazole", "itraconazole", "tenofovir", "entecavir",
    # Tiêu hóa, dạ dày
    "omeprazole", "pantoprazole", "esomeprazole", "rabeprazole", "lansoprazole",
    "ranitidine", "famotidine", "loperamide", "bisacodyl", "domperidone",
    "metoclopramide", "simethicone",
    # Hô hấp, dị ứng, giãn phế quản
    "salbutamol", "acetylcysteine", "loratadine", "cetirizine", "fexofenadine",
    "montelukast", "fluticasone", "budesonide", "chlorpheniramine", "ambroxol",
    # Tim mạch, huyết áp, mỡ máu
    "amlodipine", "captopril", "losartan", "valsartan", "enalapril", "nifedipine",
    "bisoprolol", "metoprolol", "atorvastatin", "rosuvastatin", "simvastatin",
    "fenofibrate", "clopidogrel",
    # Tiểu đường
    "metformin", "gliclazide", "glimepiride", "sitagliptin", "dapagliflozin",
    # Thần kinh, an thần, giảm đau dây thần kinh
    "diazepam", "zolpidem", "gabapentin", "pregabalin", "sertraline", "fluoxetine",
    "amitriptyline", "carbamazepine", "valproate",
    # Corticoid, nội tiết
    "prednisolone", "methylprednisolone", "prednisone", "dexamethasone", "levothyroxine",
    # Cơ xương khớp, loãng xương
    "glucosamine", "alendronate"
]

# 2. Từ điển ánh xạ bệnh lý/triệu chứng song ngữ Anh - Việt để tự động dịch và gán nhãn
DISEASE_MAPPING: Dict[str, List[str]] = {
    # Triệu chứng thông thường
    "fever": ["Sốt", "Hạ sốt", "Fever"],
    "headache": ["Đau đầu", "Nhức đầu", "Headache"],
    "toothache": ["Đau răng", "Toothache"],
    "migraine": ["Đau nửa đầu", "Migraine"],
    "pain": ["Giảm đau", "Đau nhức", "Đau cơ", "Pain relief"],
    "inflammation": ["Kháng viêm", "Chống viêm", "Inflammation"],
    
    # Bệnh cơ xương khớp & Gout
    "gout": ["Gout", "Gút", "Acid uric máu cao", "Gout flare"],
    "arthritis": ["Viêm khớp", "Đau khớp", "Arthritis"],
    "osteoarthritis": ["Thoái hóa khớp", "Osteoarthritis"],
    "osteoporosis": ["Loãng xương", "Xương khớp", "Osteoporosis"],
    "rheumatoid": ["Viêm khớp dạng thấp", "Rheumatoid arthritis"],
    "backache": ["Đau lưng", "Backache"],
    
    # Bệnh đường tiêu hóa
    "diarrhea": ["Tiêu chảy", "Tiêu chảy cấp", "Diarrhea"],
    "constipation": ["Táo bón", "Nhuận tràng", "Constipation"],
    "gerd": ["Trào ngược dạ dày thực quản", "GERD"],
    "reflux": ["Trào ngược dạ dày", "Reflux"],
    "ulcer": ["Loét dạ dày tá tràng", "Đau dạ dày", "Gastric ulcer", "Peptic ulcer"],
    "gastritis": ["Viêm dạ dày", "Gastritis"],
    "nausea": ["Buồn nôn", "Nausea"],
    "vomiting": ["Nôn mửa", "Vomiting"],
    "flatulence": ["Đầy hơi", "Chướng bụng", "Khó tiêu", "Flatulence"],
    "spasm": ["Co thắt cơ trơn", "Co thắt dạ dày", "Spasm"],
    
    # Bệnh hô hấp & Tai mũi họng
    "cough": ["Ho", "Ho có đờm", "Ho khan", "Cough"],
    "bronchitis": ["Viêm phế quản", "Bronchitis"],
    "pharyngitis": ["Viêm họng", "Pharyngitis"],
    "sinusitis": ["Viêm xoang", "Sinusitis"],
    "asthma": ["Hen suyễn", "Khó thở", "Asthma"],
    "copd": ["Tắc nghẽn phổi mạn tính", "COPD"],
    "rhinitis": ["Viêm mũi dị ứng", "Mũi dị ứng", "Allergic rhinitis"],
    "pneumonia": ["Viêm phổi", "Pneumonia"],
    "tuberculosis": ["Lao phổi", "Bệnh lao", "Tuberculosis"],
    "congestion": ["Nghẹt mũi", "Sổ mũi", "Nasal congestion"],
    
    # Bệnh dị ứng & Da liễu
    "allergy": ["Dị ứng", "Mề đay", "Mẩn ngứa", "Allergy"],
    "urticaria": ["Mề đay", "Urticaria"],
    "dermatitis": ["Viêm da", "Dermatitis"],
    "eczema": ["Chàm", "Eczema"],
    "psoriasis": ["Vảy nến", "Psoriasis"],
    "acne": ["Mụn trứng cá", "Acne"],
    "pruritus": ["Ngứa da", "Pruritus"],
    
    # Bệnh tim mạch & Tuần hoàn
    "hypertension": ["Cao huyết áp", "Tăng huyết áp", "Hypertension"],
    "heart failure": ["Suy tim", "Heart failure"],
    "angina": ["Đau thắt ngực", "Thiếu máu cơ tim", "Angina"],
    "arrhythmia": ["Loạn nhịp tim", "Arrhythmia"],
    "stroke": ["Đột quỵ", "Tai biến mạch máu não", "Stroke"],
    "thrombosis": ["Huyết khối", "Phòng đột quỵ", "Thrombosis"],
    
    # Bệnh nội tiết & Chuyển hóa
    "diabetes": ["Tiểu đường", "Đái tháo đường", "Đường huyết cao", "Diabetes"],
    "hyperglycemia": ["Tăng đường huyết", "Hyperglycemia"],
    "cholesterol": ["Mỡ máu cao", "Rối loạn mỡ máu", "Hạ cholesterol", "High cholesterol"],
    "lipid": ["Rối loạn lipid máu", "Dyslipidemia"],
    "thyroid": ["Tuyến giáp", "Suy giáp", "Cường giáp", "Thyroid"],
    
    # Bệnh thần kinh & Tâm thần
    "insomnia": ["Mất ngủ", "Khó ngủ", "Insomnia"],
    "anxiety": ["Lo âu", "Căng thẳng", "Anxiety"],
    "depression": ["Trầm cảm", "Depression"],
    "epilepsy": ["Động kinh", "Co giật", "Epilepsy"],
    "neuropathy": ["Đau dây thần kinh", "Bệnh thần kinh ngoại biên", "Neuropathy"],
    "parkinson": ["Parkinson", "Run tay chân", "Parkinson's disease"],
    "dementia": ["Sa sút trí tuệ", "Alzheimer", "Dementia"],
    
    # Nhiễm trùng & Truyền nhiễm
    "infection": ["Nhiễm trùng", "Nhiễm khuẩn", "Kháng sinh", "Infection"],
    "viral": ["Nhiễm virus", "Kháng virus", "Viral infection"],
    "influenza": ["Cúm", "Cúm A", "Cúm B", "Influenza"],
    "herpes": ["Nhiễm virus Herpes", "Zona thần kinh", "Thủy đậu", "Herpes"],
    "fungal": ["Nhiễm nấm", "Nấm da", "Nấm kẽ", "Fungal"],
    "hepatitis": ["Viêm gan B", "Viêm gan C", "Men gan cao", "Hepatitis"],
    "malaria": ["Sốt rét", "Malaria"],
    "dengue": ["Sốt xuất huyết", "Dengue"],
    
    # Nhãn khoa
    "conjunctivitis": ["Viêm kết mạc", "Đau mắt đỏ", "Conjunctivitis"],
    "glaucoma": ["Tăng nhãn áp", "Glaucoma"],
    
    # Khác
    "erectile": ["Yếu sinh lý", "Rối loạn cương dương", "Erectile dysfunction"]
}

# Nhóm phân loại thuốc mặc định (sẽ dùng nếu FDA không trả về pharm_class)
DRUG_TYPE_FALLBACK: Dict[str, str] = {
    "paracetamol": "Giảm đau, hạ sốt (Analgesic/Antipyretic)",
    "ibuprofen": "Kháng viêm không Steroid (NSAID)",
    "colchicine": "Thuốc trị Gút/Gout cấp (Antigout agent)",
    "allopurinol": "Thuốc hạ Acid Uric máu (Antigout / Xanthine oxidase inhibitor)",
    "febuxostat": "Thuốc hạ Acid Uric máu thế hệ mới (Xanthine oxidase inhibitor)",
    "meloxicam": "Thuốc kháng viêm giảm đau xương khớp (NSAID)",
    "aspirin": "Kháng tiểu cầu, giảm đau, ngừa huyết khối (Antiplatelet/NSAID)",
    "celecoxib": "Thuốc kháng viêm giảm đau ức chế COX-2 (NSAID)",
    "etoricoxib": "Thuốc kháng viêm giảm đau ức chế COX-2 mạnh (NSAID)",
    "diclofenac": "Kháng viêm giảm đau xương khớp mạnh (NSAID)",
    "naproxen": "Kháng viêm giảm đau mức độ vừa (NSAID)",
    "amoxicillin": "Kháng sinh nhóm Penicillin (Beta-lactam antibiotic)",
    "ciprofloxacin": "Kháng sinh nhóm Quinolone (Fluoroquinolone antibiotic)",
    "cefuroxime": "Kháng sinh Cephalosporin thế hệ 2 (Cephalosporin)",
    "cefixime": "Kháng sinh Cephalosporin thế hệ 3 (Cephalosporin)",
    "cephalexin": "Kháng sinh Cephalosporin thế hệ 1 (Cephalosporin)",
    "azithromycin": "Kháng sinh nhóm Macrolide (Macrolide antibiotic)",
    "clarithromycin": "Kháng sinh nhóm Macrolide trị HP dạ dày (Macrolide)",
    "metronidazole": "Kháng khuẩn, trị nhiễm trùng kị khí và ký sinh trùng",
    "acyclovir": "Thuốc kháng virus Herpes, Zona (Antiviral)",
    "oseltamivir": "Thuốc điều trị cúm A/B (Antiviral)",
    "fluconazole": "Thuốc kháng nấm đường uống (Antifungal)",
    "ketoconazole": "Thuốc trị nấm da, nấm tóc (Antifungal)",
    "itraconazole": "Thuốc trị nấm móng, nấm toàn thân (Antifungal)",
    "tenofovir": "Thuốc điều trị viêm gan B và HIV (Antiviral)",
    "entecavir": "Thuốc điều trị viêm gan B mạn tính (Antiviral)",
    "omeprazole": "Ức chế bơm Proton trị dạ dày (PPI)",
    "pantoprazole": "Ức chế bơm Proton thế hệ mới trị dạ dày (PPI)",
    "esomeprazole": "Ức chế bơm Proton thế hệ mới trị dạ dày (PPI)",
    "rabeprazole": "Ức chế bơm Proton điều trị dạ dày (PPI)",
    "lansoprazole": "Ức chế bơm Proton trị trào ngược dạ dày (PPI)",
    "ranitidine": "Thuốc kháng H2 trị đau dạ dày (H2 blocker)",
    "famotidine": "Thuốc kháng H2 trị đau dạ dày (H2 blocker)",
    "loperamide": "Thuốc cầm tiêu chảy (Antidiarrheal)",
    "bisacodyl": "Thuốc nhuận tràng trị táo bón (Laxative)",
    "domperidone": "Thuốc chống nôn, điều hòa nhu động ruột (Antiemetic)",
    "metoclopramide": "Thuốc chống nôn, kích thích nhu động dạ dày (Antiemetic)",
    "simethicone": "Thuốc trị đầy hơi, chướng bụng (Antiflatulent)",
    "salbutamol": "Thuốc giãn phế quản trị hen (Bronchodilator)",
    "acetylcysteine": "Thuốc long đờm (Mucolytic)",
    "loratadine": "Kháng Histamine trị dị ứng (Antihistamine)",
    "cetirizine": "Kháng Histamine trị dị ứng (Antihistamine)",
    "fexofenadine": "Kháng Histamine trị dị ứng thế hệ mới (Antihistamine)",
    "montelukast": "Thuốc dự phòng hen suyễn, viêm mũi dị ứng (Leukotriene receptor antagonist)",
    "fluticasone": "Corticoid xịt mũi trị viêm mũi dị ứng (Corticosteroid)",
    "budesonide": "Corticoid xịt, hít trị hen suyễn (Corticosteroid)",
    "chlorpheniramine": "Thuốc dị ứng gây buồn ngủ thế hệ cũ (Antihistamine)",
    "ambroxol": "Thuốc tiêu nhầy đờm đường hô hấp (Mucolytic)",
    "amlodipine": "Thuốc hạ huyết áp chẹn kênh Canxi (Calcium channel blocker)",
    "captopril": "Thuốc hạ huyết áp ức chế men chuyển (ACE inhibitor)",
    "losartan": "Thuốc hạ huyết áp chẹn thụ thể Angiotensin II (ARB)",
    "valsartan": "Thuốc điều trị tăng huyết áp, suy tim (ARB)",
    "enalapril": "Thuốc điều trị tăng huyết áp, suy tim (ACE inhibitor)",
    "nifedipine": "Thuốc điều trị tăng huyết áp, đau thắt ngực (Calcium channel blocker)",
    "bisoprolol": "Thuốc điều trị tăng huyết áp, suy tim (Beta-blocker)",
    "metoprolol": "Thuốc chẹn beta trị tăng huyết áp, loạn nhịp tim (Beta-blocker)",
    "atorvastatin": "Thuốc hạ mỡ máu (Statin)",
    "rosuvastatin": "Thuốc hạ mỡ máu mạnh (Statin)",
    "simvastatin": "Thuốc hạ lipid máu (Statin)",
    "fenofibrate": "Thuốc điều trị tăng triglyceride máu (Fibrate)",
    "clopidogrel": "Thuốc chống kết tập tiểu cầu ngừa đột quỵ (Antiplatelet)",
    "metformin": "Thuốc trị tiểu đường nhóm Biguanide (Antidiabetic)",
    "gliclazide": "Thuốc trị tiểu đường nhóm Sulfonylurea (Antidiabetic)",
    "glimepiride": "Thuốc trị tiểu đường nhóm Sulfonylurea thế hệ mới (Antidiabetic)",
    "sitagliptin": "Thuốc trị tiểu đường ức chế DPP-4 (Antidiabetic)",
    "dapagliflozin": "Thuốc trị tiểu đường thải đường qua nước tiểu (SGLT2 inhibitor)",
    "diazepam": "Thuốc hướng thần an thần, trị mất ngủ (Sedative/Anxiolytic)",
    "zolpidem": "Thuốc ngủ điều trị mất ngủ ngắn hạn (Sedative-hypnotic)",
    "gabapentin": "Thuốc trị đau dây thần kinh, động kinh (Anticonvulsant)",
    "pregabalin": "Thuốc trị đau dây thần kinh, lo âu (Anticonvulsant/Anxiolytic)",
    "sertraline": "Thuốc điều trị trầm cảm, lo âu (SSRI)",
    "fluoxetine": "Thuốc chống trầm cảm, rối loạn lo âu (SSRI)",
    "amitriptyline": "Thuốc chống trầm cảm 3 vòng, trị đau dây thần kinh (Antidepressant)",
    "carbamazepine": "Thuốc trị động kinh, đau dây thần kinh số V (Anticonvulsant)",
    "valproate": "Thuốc trị động kinh, dự phòng đau nửa đầu (Anticonvulsant)",
    "prednisolone": "Kháng viêm Corticosteroid (Corticosteroid)",
    "methylprednisolone": "Kháng viêm Glucocorticoid mạnh (Corticosteroid)",
    "prednisone": "Kháng viêm, ức chế miễn dịch (Corticosteroid)",
    "dexamethasone": "Kháng viêm Corticosteroid cực mạnh (Corticosteroid)",
    "levothyroxine": "Hormone tuyến giáp điều trị suy giáp (Thyroid hormone)",
    "glucosamine": "Thuốc hỗ trợ tái tạo sụn khớp (Anti-osteoarthritis agent)",
    "alendronate": "Thuốc chống hủy xương điều trị loãng xương (Bisphosphonate)"
}

def clean_text(text: str) -> str:
    """
    Làm sạch văn bản, loại bỏ các ký hiệu định dạng thô thừa thãi.
    """
    if not text:
        return ""
    # Giới hạn độ dài văn bản để tránh quá tải dung lượng file JSON
    cleaned = text.replace('\n', ' ').replace('\r', '').replace('  ', ' ')
    return cleaned.strip()

def map_diseases(indications_text: str) -> List[str]:
    """
    Phân tích văn bản chỉ định tiếng Anh từ FDA để phát hiện
    các triệu chứng/bệnh lý tương ứng trong từ điển và gán nhãn.
    
    Args:
        indications_text: Đoạn văn bản chỉ định điều trị bằng tiếng Anh.
        
    Returns:
        Danh sách các bệnh lý song ngữ phù hợp.
    """
    matched_diseases: Set[str] = set()
    text_lower = indications_text.lower()
    
    for key, val in DISEASE_MAPPING.items():
        # Kiểm tra xem từ khóa tiếng Anh có xuất hiện trong chỉ định không
        if key in text_lower:
            for item in val:
                matched_diseases.add(item)
                
    return sorted(list(matched_diseases))

# Đường dẫn file cache dịch
CACHE_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "translation_cache.json"))
TRANSLATION_CACHE: Dict[str, str] = {}

def load_translation_cache() -> None:
    """
    Tải cache dịch từ tệp JSON.
    """
    global TRANSLATION_CACHE
    if os.path.exists(CACHE_FILE_PATH):
        try:
            with open(CACHE_FILE_PATH, 'r', encoding='utf-8') as f:
                TRANSLATION_CACHE = json.load(f)
            print(f"[Thông tin] Đã tải {len(TRANSLATION_CACHE)} bản ghi dịch từ cache.")
        except Exception as e:
            print(f"[Cảnh báo] Không thể đọc cache dịch: {e}")

def save_translation_cache() -> None:
    """
    Lưu cache dịch vào tệp JSON.
    """
    try:
        with open(CACHE_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(TRANSLATION_CACHE, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Cảnh báo] Không thể ghi cache dịch: {e}")

def translate_text(text: str) -> str:
    """
    Dịch văn bản tiếng Anh sang tiếng Việt sử dụng Google Translate API miễn phí.
    Hỗ trợ cơ chế cache và retry khi gặp lỗi mạng/rate limit.
    """
    if not text or not text.strip():
        return ""
    
    text_clean = text.strip()
    # Kiểm tra trong cache trước
    if text_clean in TRANSLATION_CACHE:
        return TRANSLATION_CACHE[text_clean]
        
    # Giới hạn độ dài để tránh lỗi URL
    text_to_translate = text_clean[:1000]
    
    url = "https://translate.googleapis.com/translate_a/single"
    params = {
        "client": "gtx",
        "sl": "en",
        "tl": "vi",
        "dt": "t",
        "q": text_to_translate
    }
    query_string = urllib.parse.urlencode(params)
    full_url = f"{url}?{query_string}"
    
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(full_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                result = json.loads(response.read().decode('utf-8'))
                
            translated_chunks = []
            if result and isinstance(result, list) and result[0]:
                for chunk in result[0]:
                    if chunk and isinstance(chunk, list) and chunk[0]:
                        translated_chunks.append(chunk[0])
                        
            translated_text = "".join(translated_chunks)
            if translated_text:
                TRANSLATION_CACHE[text_clean] = translated_text
                save_translation_cache()
                return translated_text
            
            return text_clean
        except Exception as e:
            if attempt < max_retries:
                sleep_time = attempt * 2
                print(f"      [Cảnh báo dịch] Lỗi dịch (Lần thử {attempt}/{max_retries}): {e}. Đang thử lại sau {sleep_time}s...")
                time.sleep(sleep_time)
            else:
                print(f"      [Cảnh báo dịch] Không thể dịch sau {max_retries} lần thử: {e}")
                return text_clean

def is_vietnamese(text: str) -> bool:
    """
    Kiểm tra xem chuỗi văn bản có chứa ký tự tiếng Việt hay không.
    """
    vi_chars = set("áàảãạâấầẩẫậăắằẳẵặéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ")
    return any(c in vi_chars for c in text)

def split_diseases(diseases_list: List[str]) -> Tuple[List[str], List[str]]:
    """
    Phân tách danh sách bệnh lý thành 2 danh sách: tiếng Anh và tiếng Việt.
    """
    en_list = []
    vi_list = []
    for d in diseases_list:
        if is_vietnamese(d):
            vi_list.append(d)
        else:
            en_list.append(d)
            # Những từ tiếng Anh thông dụng hoặc viết tắt (như Gout, GERD, COPD, HIV) cũng dùng trong tiếng Việt
            vi_list.append(d)
    return sorted(list(set(en_list))), sorted(list(set(vi_list)))

def fetch_drug_from_fda(generic_name: str) -> DrugInfo:
    """
    Gọi API OpenFDA để tải nhãn của một hoạt chất cụ thể.
    Nếu API bị lỗi hoặc không có dữ liệu, trả về cấu trúc mặc định an toàn.
    
    Args:
        generic_name: Tên hoạt chất (tiếng Anh).
        
    Returns:
        Dict chứa thông tin chi tiết về thuốc song ngữ.
    """
    formatted_name = generic_name.lower().strip()
    # Tìm kiếm chính xác tên hoạt chất gốc trong nhãn thuốc FDA
    query = f'openfda.generic_name.exact:"{formatted_name.upper()}"'
    url = f"https://api.fda.gov/drug/label.json?search={urllib.parse.quote(query)}&limit=1"
    
    print(f" -> Đang tải dữ liệu cho {generic_name}...")
    
    # Phân tích fallback_type từ từ điển
    fallback_str = DRUG_TYPE_FALLBACK.get(formatted_name, "Thông tin thuốc")
    if "(" in fallback_str and fallback_str.endswith(")"):
        parts = fallback_str.split("(")
        type_vi = parts[0].strip()
        type_en = parts[1].replace(")", "").strip()
    else:
        type_vi = fallback_str
        type_en = "Drug Information"

    # Cấu trúc mặc định nếu không tải được từ API
    fallback_info = {
        "id": formatted_name,
        "name_en": generic_name.title(),
        "name_vi": generic_name.title(),
        "type_en": type_en,
        "type_vi": type_vi,
        "diseases_en": [generic_name.title()],
        "diseases_vi": [generic_name.title()],
        "description_en": "Data is being updated from the FDA.",
        "description_vi": "Dữ liệu đang được cập nhật từ FDA.",
        "usage_en": "Please contact a doctor or pharmacist for details.",
        "usage_vi": "Liên hệ bác sĩ hoặc dược sĩ để biết thêm chi tiết.",
        "warnings_en": "Use under medical supervision.",
        "warnings_vi": "Sử dụng theo chỉ định y khoa."
    }
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        # Cấu hình timeout 5 giây để tránh bị treo
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        results = data.get('results', [])
        if not results:
            print(f"    [Cảnh báo] Không tìm thấy nhãn trên FDA cho hoạt chất: {generic_name}")
            return fallback_info
            
        item = results[0]
        openfda_info = item.get('openfda', {})
        
        # Lấy tên biệt dược thông dụng
        brand_names = openfda_info.get('brand_name', [])
        brand_name_str = f" ({brand_names[0].title()})" if brand_names else ""
        full_name_en = f"{generic_name.title()}{brand_name_str}"
        full_name_vi = full_name_en # Tên biệt dược giữ nguyên dạng Latinh/English
        
        # Lấy phân loại điều trị
        pharm_class = openfda_info.get('pharm_class_epc', openfda_info.get('pharm_class_cs', []))
        if formatted_name in DRUG_TYPE_FALLBACK:
            # Dùng fallback đã được phân tách từ trước
            pass
        else:
            raw_class = pharm_class[0] if pharm_class else "Drug Information"
            type_en = raw_class
            type_vi = translate_text(raw_class)
        
        # Lấy các trường thông tin y khoa
        indications = clean_text(item.get('indications_and_usage', [''])[0])
        dosage = clean_text(item.get('dosage_and_administration', [''])[0])
        warnings = clean_text(item.get('warnings_and_cautions', item.get('warnings', ['']))[0])
        description = clean_text(item.get('description', [''])[0])
        
        # Cắt ngắn văn bản nếu quá dài (> 600 ký tự) để tối ưu hóa PWA offline
        desc_summary = description[:600] + "..." if len(description) > 600 else (description if description else indications[:300] + "...")
        dosage_summary = dosage[:600] + "..." if len(dosage) > 600 else dosage
        warnings_summary = warnings[:600] + "..." if len(warnings) > 600 else warnings
        
        # Tự động dịch các trường thông tin y khoa sang tiếng Việt
        print(f"    -> Đang dịch mô tả tác dụng của {generic_name}...")
        desc_vi = translate_text(desc_summary)
        
        print(f"    -> Đang dịch liều lượng & cách dùng của {generic_name}...")
        usage_vi = translate_text(dosage_summary)
        
        print(f"    -> Đang dịch cảnh báo của {generic_name}...")
        warnings_vi = translate_text(warnings_summary)
        
        # Thêm một chút delay để tránh bị Google block
        time.sleep(0.1)
        
        # Tự động ánh xạ chỉ định bệnh lý
        all_diseases = map_diseases(indications)
        if not all_diseases:
            all_diseases = [generic_name.title()]
            
        # Thêm từ khóa "gout" và "gút" cụ thể nếu là thuốc trị gout để đảm bảo tìm kiếm chính xác
        if formatted_name in ["colchicine", "allopurinol", "febuxostat"]:
            if "Gout" not in all_diseases: all_diseases.append("Gout")
            if "Gút" not in all_diseases: all_diseases.append("Gút")
            if "Gout flare" not in all_diseases: all_diseases.append("Gout flare")

        diseases_en, diseases_vi = split_diseases(all_diseases)
            
        return {
            "id": formatted_name,
            "name_en": full_name_en,
            "name_vi": full_name_vi,
            "type_en": type_en,
            "type_vi": type_vi,
            "diseases_en": diseases_en,
            "diseases_vi": diseases_vi,
            "description_en": desc_summary,
            "description_vi": desc_vi,
            "usage_en": dosage_summary if dosage_summary else "Take as directed on the label or by a doctor.",
            "usage_vi": usage_vi if usage_vi else "Uống theo chỉ dẫn trên nhãn hoặc bác sĩ.",
            "warnings_en": warnings_summary if warnings_summary else "Stop use if signs of allergy appear.",
            "warnings_vi": warnings_vi if warnings_vi else "Ngưng thuốc nếu có dấu hiệu dị ứng."
        }
        
    except Exception as e:
        print(f"    [Lỗi] Không thể kết nối hoặc phân tích dữ liệu cho {generic_name}: {e}")
        # Gán nhãn bệnh tạm thời cho fallback để app vẫn chạy tốt
        if formatted_name in ["colchicine", "allopurinol", "febuxostat"]:
            fallback_info["diseases_en"] = ["Gout", "Gout flare", "High uric acid"]
            fallback_info["diseases_vi"] = ["Gout", "Gút", "Acid uric máu cao", "Khớp gút"]
            fallback_info["description_en"] = "Specific medication for lowering uric acid and reducing acute gout flares."
            fallback_info["description_vi"] = "Thuốc đặc trị hạ acid uric và giảm cơn đau gút cấp mạn tính."
        return fallback_info

def generate_inverted_indexes(data: Dataset) -> Tuple[Dict[str, Any], InvertedIndex]:
    """
    Tạo cấu trúc cơ sở dữ liệu tìm kiếm hai chiều song ngữ.
    """
    drug_map: Dict[str, Any] = {}
    disease_index: InvertedIndex = {}

    for item in data:
        drug_id = item["id"]
        drug_map[drug_id] = item

        # Tạo chỉ mục ngược từ cả diseases_en và diseases_vi
        all_diseases = set(item["diseases_en"] + item["diseases_vi"])
        for disease in all_diseases:
            disease_key = disease.strip().lower()
            if disease_key not in disease_index:
                disease_index[disease_key] = []
                
            # Đảm bảo không trùng lặp thuốc trong cùng một bệnh
            if not any(d["id"] == drug_id for d in disease_index[disease_key]):
                disease_index[disease_key].append({
                    "id": drug_id,
                    "name_en": item["name_en"],
                    "name_vi": item["name_vi"],
                    "type_en": item["type_en"],
                    "type_vi": item["type_vi"]
                })

    return drug_map, disease_index

def save_json_data(file_path: str, content: Any) -> None:
    """
    Ghi dữ liệu ra tệp JSON dạng UTF-8.
    """
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        print(f"[Thành công] Đã lưu dữ liệu vào: {file_path}")
    except IOError as e:
        print(f"[Lỗi] Không thể ghi file {file_path}: {e}")

def main() -> None:
    """
    Hàm thực thi chính của ETL pipeline tải dữ liệu hàng loạt.
    """
    print("==================================================")
    print("BẮT ĐẦU PIPELINE TỰ ĐỘNG TẢI DỮ LIỆU TỪ OPENFDA...")
    print("==================================================")
    
    # Tải cache dịch nếu có
    load_translation_cache()
    
    dataset: Dataset = []
    
    # Lặp và tải từng thuốc trong danh sách thiết yếu
    for drug_name in ESSENTIAL_DRUGS:
        drug_info = fetch_drug_from_fda(drug_name)
        dataset.append(drug_info)
        # Giãn cách 200ms giữa các request để tuân thủ Rate Limit y tế
        time.sleep(0.2)
        
    print("\n--------------------------------------------------")
    print("Đang xử lý tạo chỉ mục ngược tìm kiếm...")
    drug_map, disease_index = generate_inverted_indexes(dataset)
    
    # Đường dẫn thư mục đích trong src
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "data"))
    
    drug_db_path = os.path.join(target_dir, "drugs_db.json")
    disease_index_path = os.path.join(target_dir, "diseases_index.json")
    
    # Lưu kết quả
    save_json_data(drug_db_path, drug_map)
    save_json_data(disease_index_path, disease_index)
    
    print("\n==================================================")
    print("QUY TRÌNH ETL TỰ ĐỘNG HOÀN TẤT THÀNH CÔNG!")
    print(f"Tổng số hoạt chất đã nạp: {len(dataset)}")
    print("==================================================")

if __name__ == "__main__":
    main()

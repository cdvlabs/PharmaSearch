/**
 * PharmaSearch - Ứng dụng tra cứu y khoa
 */

// Danh sách 83 hoạt chất thiết yếu thông dụng làm gợi ý tự động cho Tên Thuốc
const ESSENTIAL_DRUGS = [
  "paracetamol", "ibuprofen", "colchicine", "allopurinol", "febuxostat",
  "meloxicam", "aspirin", "celecoxib", "etoricoxib", "diclofenac", "naproxen",
  "amoxicillin", "ciprofloxacin", "cefuroxime", "cefixime", "cephalexin",
  "azithromycin", "clarithromycin", "metronidazole", "acyclovir", "oseltamivir",
  "fluconazole", "ketoconazole", "itraconazole", "tenofovir", "entecavir",
  "omeprazole", "pantoprazole", "esomeprazole", "rabeprazole", "lansoprazole",
  "ranitidine", "famotidine", "loperamide", "bisacodyl", "domperidone",
  "metoclopramide", "simethicone", "salbutamol", "acetylcysteine", "loratadine",
  "cetirizine", "fexofenadine", "montelukast", "fluticasone", "budesonide",
  "chlorpheniramine", "ambroxol", "amlodipine", "captopril", "losartan",
  "valsartan", "enalapril", "nifedipine", "bisoprolol", "metoprolol",
  "atorvastatin", "rosuvastatin", "simvastatin", "fenofibrate", "clopidogrel",
  "metformin", "gliclazide", "glimepiride", "sitagliptin", "dapagliflozin",
  "diazepam", "zolpidem", "gabapentin", "pregabalin", "sertraline", "fluoxetine",
  "amitriptyline", "carbamazepine", "valproate", "prednisolone", "methylprednisolone",
  "prednisone", "dexamethasone", "levothyroxine", "glucosamine", "alendronate"
];

// Trạng thái ứng dụng
let diseaseDict = {}; // Từ điển bệnh lý tĩnh Anh-Việt
let currentTab = 'disease'; // 'disease' hoặc 'drug'
let currentLang = localStorage.getItem('pharma_lang') || 'vi'; // 'vi' hoặc 'en'
let deferredPrompt = null;
const searchCache = new Map(); // Cache tìm kiếm online để tăng tốc và tiết kiệm băng thông

// Bộ dịch văn bản giao diện (UI)
const UI_TRANSLATIONS = {
  vi: {
    subtitle: "Tra cứu Thuốc & Bệnh lý trực tuyến FDA",
    tabDisease: "Tìm theo Bệnh lý",
    tabDrug: "Tìm theo Tên Thuốc",
    placeholderDisease: "Nhập tên bệnh hoặc triệu chứng...",
    placeholderDrug: "Nhập tên thuốc hoặc hoạt chất...",
    placeholderMsg: "Bắt đầu nhập từ khóa tìm kiếm để tra cứu thông tin y khoa.",
    loadingText: "Đang tải và dịch dữ liệu từ FDA...",
    noResults: "Không tìm thấy kết quả phù hợp với từ khóa \"{query}\" trên FDA.",
    installBtn: "📲 Cài đặt ứng dụng về điện thoại",
    copyright: "© 2026 PharmaSearch. Đồng bộ trực tuyến & Miễn phí hoàn toàn.",
    source: "Dữ liệu chuẩn hóa từ DeepMind Science Skills",
    descTitle: "Mô tả tác dụng",
    usageTitle: "Cách dùng & Liều lượng",
    warningsTitle: "Lưu ý & Cảnh báo",
    indicationsTitle: "Chỉ định trị liệu",
    onlineBadge: "Trực tuyến (FDA)",
    offlineBadge: "Ngoại tuyến (Local)",
    noConnection: "Không có kết nối Internet. Vui lòng kiểm tra lại mạng.",
    defaultUsage: "Uống theo chỉ dẫn trên nhãn hoặc bác sĩ.",
    defaultWarning: "Ngưng thuốc nếu có dấu hiệu dị ứng."
  },
  en: {
    subtitle: "Online Medical & FDA Drug Search",
    tabDisease: "Search by Disease",
    tabDrug: "Search by Drug Name",
    placeholderDisease: "Enter disease name or symptoms...",
    placeholderDrug: "Enter drug or active ingredient...",
    placeholderMsg: "Start entering keywords to search for medical information.",
    loadingText: "Loading and retrieving data from FDA...",
    noResults: "No matching results found for \"{query}\" on FDA.",
    installBtn: "📲 Install application to phone",
    copyright: "© 2026 PharmaSearch. Works Online & 100% Free.",
    source: "Data standardized from DeepMind Science Skills",
    descTitle: "Description & Indications",
    usageTitle: "Dosage & Administration",
    warningsTitle: "Warnings & Precautions",
    indicationsTitle: "Therapeutic Indications",
    onlineBadge: "Online (FDA)",
    offlineBadge: "Offline (Local)",
    noConnection: "No internet connection. Please check your network.",
    defaultUsage: "Take as directed on the label or by a doctor.",
    defaultWarning: "Stop use if signs of allergy appear."
  }
};

// Các phần tử DOM cần tương tác
const searchInput = document.getElementById('search-input');
const suggestionsList = document.getElementById('suggestions-list');
const resultsList = document.getElementById('results-list');
const placeholderBox = document.getElementById('placeholder-box');
const placeholderMsg = document.getElementById('placeholder-msg');
const tabDisease = document.getElementById('tab-disease');
const tabDrug = document.getElementById('tab-drug');
const installBtn = document.getElementById('install-btn');
const langSwitchBtn = document.getElementById('lang-switch-btn');
const langText = document.getElementById('lang-text');
const appSubtitle = document.getElementById('app-subtitle');
const loadingSpinner = document.getElementById('loading-spinner');
const loadingText = document.getElementById('loading-text');
const footerCopyright = document.getElementById('footer-copyright');
const footerSource = document.getElementById('footer-source');

/**
 * Cập nhật ngôn ngữ giao diện theo lựa chọn
 */
function updateUILanguage() {
  const t = UI_TRANSLATIONS[currentLang];
  
  // Cập nhật text nút switch ngôn ngữ
  langText.textContent = currentLang === 'vi' ? 'EN' : 'VI';
  
  // Cập nhật text tiêu đề phụ
  appSubtitle.textContent = t.subtitle;
  
  // Cập nhật text các nút Tab
  tabDisease.textContent = t.tabDisease;
  tabDrug.textContent = t.tabDrug;
  
  // Cập nhật placeholder tìm kiếm dựa theo Tab và Ngôn ngữ
  if (currentTab === 'disease') {
    searchInput.placeholder = t.placeholderDisease;
  } else {
    searchInput.placeholder = t.placeholderDrug;
  }
  
  // Cập nhật hộp placeholder
  placeholderMsg.textContent = t.placeholderMsg;
  
  // Cập nhật spinner text
  loadingText.textContent = t.loadingText;
  
  // Cập nhật nút cài đặt PWA
  if (installBtn) {
    installBtn.textContent = t.installBtn;
  }
  
  // Cập nhật footer
  footerCopyright.textContent = t.copyright;
  footerSource.textContent = t.source;
  
  // Render lại kết quả tìm kiếm nếu có query
  const lastQuery = searchInput.value.trim();
  if (lastQuery && loadingSpinner.style.display !== 'flex') {
    executeSearch(lastQuery);
  }
}

/**
 * Chuyển đổi ngôn ngữ của ứng dụng
 */
function toggleLanguage() {
  currentLang = currentLang === 'vi' ? 'en' : 'vi';
  localStorage.setItem('pharma_lang', currentLang);
  updateUILanguage();
}

/**
 * Dịch văn bản Client-Side động qua Google Translate API
 * @param {string} text - Văn bản cần dịch
 * @param {string} targetLang - Ngôn ngữ đích
 * @returns {Promise<string>} - Văn bản đã dịch
 */
async function translateClientSide(text, targetLang = 'vi') {
  if (!text || !text.trim()) return "";
  if (targetLang === 'en') return text; // FDA trả về tiếng Anh, không cần dịch
  
  try {
    const cleanText = text.trim().substring(0, 1000); // Giới hạn độ dài để không bị lỗi HTTP GET
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText)}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Translation request failed");
    
    const result = await response.json();
    let translated = "";
    if (result && result[0]) {
      result[0].forEach(chunk => {
        if (chunk && chunk[0]) translated += chunk[0];
      });
    }
    return translated || text;
  } catch (error) {
    console.error("Lỗi dịch động Client-side:", error);
    return text; // Trả về bản gốc nếu lỗi
  }
}

/**
 * Giới hạn độ dài chuỗi văn bản
 * @param {string} text - Văn bản cần rút gọn
 * @param {number} limit - Độ dài tối đa
 * @returns {string} - Văn bản đã rút gọn
 */
function limitText(text, limit = 550) {
  if (!text) return "";
  return text.length > limit ? text.substring(0, limit) + "..." : text;
}

/**
 * Tải cơ sở dữ liệu từ các tệp JSON tĩnh ngoại tuyến
 */
async function loadDatabase() {
  try {
    const dictResponse = await fetch('data/disease_dictionary.json');

    if (!dictResponse.ok) {
      throw new Error('Không thể đọc dữ liệu offline từ máy chủ.');
    }

    diseaseDict = await dictResponse.json();
    console.log('Đã nạp từ điển bệnh lý song ngữ thành công.');
  } catch (error) {
    console.error('Lỗi khi tải từ điển:', error);
    placeholderMsg.textContent = currentLang === 'vi' 
      ? 'Không thể tải cơ sở dữ liệu offline. Vui lòng tải lại trang.' 
      : 'Failed to load offline database. Please reload page.';
  }
}

/**
 * Cập nhật hiển thị các nút điều khiển dựa trên tab hiện tại
 */
function updateControlsVisibility() {
  const searchOptions = document.querySelector('.search-options');
  if (currentTab === 'disease') {
    if (langSwitchBtn) langSwitchBtn.style.display = 'none';
    if (searchOptions) searchOptions.style.display = 'none';
  } else {
    if (langSwitchBtn) langSwitchBtn.style.display = 'flex';
    if (searchOptions) searchOptions.style.display = 'flex';
  }
}

/**
 * Chuyển đổi tab tìm kiếm
 * @param {string} tab - Tên tab ('disease' hoặc 'drug')
 */
function switchTab(tab) {
  if (currentTab === tab) return;
  currentTab = tab;

  const t = UI_TRANSLATIONS[currentLang];
  updateControlsVisibility();

  if (currentTab === 'disease') {
    tabDisease.classList.add('active');
    tabDisease.setAttribute('aria-selected', 'true');
    tabDrug.classList.remove('active');
    tabDrug.setAttribute('aria-selected', 'false');
    searchInput.placeholder = t.placeholderDisease;
  } else {
    tabDrug.classList.add('active');
    tabDrug.setAttribute('aria-selected', 'true');
    tabDisease.classList.remove('active');
    tabDisease.setAttribute('aria-selected', 'false');
    searchInput.placeholder = t.placeholderDrug;
  }

  searchInput.value = '';
  hideSuggestions();
  clearResults();
}

/**
 * Ẩn danh sách gợi ý tìm kiếm
 */
function hideSuggestions() {
  suggestionsList.innerHTML = '';
  suggestionsList.style.display = 'none';
}

/**
 * Xóa kết quả tìm kiếm cũ
 */
function clearResults() {
  resultsList.innerHTML = '';
  placeholderBox.style.display = 'flex';
  loadingSpinner.style.display = 'none';
}

/**
 * Thực hiện gợi ý tự động (Auto-suggest) dựa trên dữ liệu offline
 */
searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    hideSuggestions();
    clearResults();
    return;
  }

  let matches = [];

  if (currentTab === 'disease') {
    // Lọc các từ khóa bệnh lý khớp với truy vấn trong từ điển tĩnh diseaseDict
    matches = Object.keys(diseaseDict).filter(key => key.includes(query));
  } else {
    // Lọc từ danh sách hoạt chất thiết yếu tĩnh
    matches = ESSENTIAL_DRUGS
      .filter(name => name.toLowerCase().includes(query))
      .map(name => name.toUpperCase());
  }

  // Giới hạn gợi ý tối đa 5 kết quả
  displaySuggestions(matches.slice(0, 5), query);
});

/**
 * Hiển thị gợi ý ra màn hình
 * @param {Array<string>} list - Danh sách gợi ý
 * @param {string} query - Truy vấn hiện tại
 */
function displaySuggestions(list, query) {
  if (list.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsList.innerHTML = '';
  list.forEach(item => {
    const li = document.createElement('li');
    const index = item.toLowerCase().indexOf(query);
    if (index >= 0) {
      const before = item.substring(0, index);
      const match = item.substring(index, index + query.length);
      const after = item.substring(index + query.length);
      li.innerHTML = `${before}<strong>${match}</strong>${after}`;
    } else {
      li.textContent = item;
    }

    li.addEventListener('click', () => {
      searchInput.value = item;
      hideSuggestions();
      executeSearch(item);
    });

    suggestionsList.appendChild(li);
  });

  suggestionsList.style.display = 'block';
}

// Nhấn Enter để tìm kiếm
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    if (query) {
      hideSuggestions();
      executeSearch(query);
    }
  }
});

// Click ra ngoài để đóng gợi ý
document.addEventListener('click', (e) => {
  if (e.target !== searchInput && e.target !== suggestionsList) {
    hideSuggestions();
  }
});

/**
 * Thực hiện tìm kiếm trực tuyến trên OpenFDA
 * @param {string} query - Từ khóa tìm kiếm
 * @param {string} tab - Tab hiện tại ('disease' hay 'drug')
 * @returns {Promise<Array>} - Kết quả tìm kiếm chuẩn hóa song ngữ
 */
async function searchOpenFDAOnline(query, tab) {
  if (!navigator.onLine) {
    throw new Error("OFFLINE");
  }
  
  const cacheKey = `${tab}_${query}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  let searchUrl = "";
  // Rút gọn cụm từ chính trước dấu ngoặc đơn và loại bỏ ký tự lạ để tránh lỗi Lucene của FDA
  let cleanQuery = query.split('(')[0].trim().toLowerCase();
  cleanQuery = cleanQuery.replace(/[^a-z0-9\s-]/g, '').trim();
  
  // Tab drug tìm trực tuyến
  searchUrl = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(cleanQuery)}"+OR+openfda.brand_name:"${encodeURIComponent(cleanQuery)}"+OR+openfda.generic_name:${encodeURIComponent(cleanQuery)}&limit=10`;
  
  const response = await fetch(searchUrl);
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("FDA API Error");
  }
  
  const data = await response.json();
  const results = data.results || [];
  const formattedResults = [];

  for (const item of results) {
    const openfda = item.openfda || {};
    const genericName = openfda.generic_name ? openfda.generic_name[0] : "";
    const brandName = openfda.brand_name ? openfda.brand_name[0] : "";
    
    if (!genericName && !brandName) continue; // Bỏ qua nếu không có thông tin tên
    
    const nameEn = genericName ? `${genericName.toUpperCase()}${brandName ? ` (${brandName})` : ''}` : brandName;
    const id = (genericName || brandName).toLowerCase().replace(/[^a-z0-9]/g, "-");
    
    const pharmClass = openfda.pharm_class_epc || openfda.pharm_class_cs || [];
    const typeEn = pharmClass[0] || "Drug Information";
    
    // Lấy thông tin văn bản y khoa
    const rawDesc = item.description ? item.description[0] : (item.indications_and_usage ? item.indications_and_usage[0] : "");
    const rawUsage = item.dosage_and_administration ? item.dosage_and_administration[0] : "";
    const rawWarnings = item.warnings_and_cautions ? item.warnings_and_cautions[0] : (item.warnings ? item.warnings[0] : "");
    
    // Tóm tắt văn bản để dịch nhanh và mượt
    const descEn = rawDesc.substring(0, 450) + (rawDesc.length > 450 ? "..." : "");
    const usageEn = rawUsage.substring(0, 450) + (rawUsage.length > 450 ? "..." : "");
    const warningsEn = rawWarnings.substring(0, 450) + (rawWarnings.length > 450 ? "..." : "");
    
    // Khởi tạo đối tượng kết quả song ngữ
    const drugObj = {
      id: id,
      name_en: nameEn,
      name_vi: nameEn, // Tên hoạt chất y khoa giữ nguyên gốc Latin
      type_en: typeEn,
      type_vi: "", // Sẽ dịch động sau
      description_en: descEn,
      description_vi: "",
      usage_en: usageEn || "Take as directed by a doctor.",
      usage_vi: "",
      warnings_en: warningsEn || "Stop use if allergy symptoms occur.",
      warnings_vi: "",
      diseases_en: [typeEn],
      diseases_vi: [],
      isOnline: true
    };
    
    // Dịch động các trường sang tiếng Việt nếu cần hiển thị song ngữ
    if (currentLang === 'vi') {
      const [typeVi, descVi, usageVi, warningsVi] = await Promise.all([
        translateClientSide(typeEn, 'vi'),
        translateClientSide(descEn, 'vi'),
        translateClientSide(usageEn, 'vi'),
        translateClientSide(warningsEn, 'vi')
      ]);
      drugObj.type_vi = typeVi;
      drugObj.description_vi = descVi;
      drugObj.usage_vi = usageVi;
      drugObj.warnings_vi = warningsVi;
      
      if (typeEn) {
        const typeViPill = await translateClientSide(typeEn, 'vi');
        drugObj.diseases_vi = [typeViPill];
      } else {
        drugObj.diseases_vi = [query];
      }
    }
    
    formattedResults.push(drugObj);
  }

  // Lưu vào cache
  searchCache.set(cacheKey, formattedResults);
  return formattedResults;
}

/**
 * Tìm kiếm y khoa theo Bệnh lý online trên OpenFDA sử dụng cơ chế đếm tần suất hoạt chất
 * @param {string} query - Từ khóa bệnh lý của người dùng (Anh hoặc Việt)
 * @returns {Promise<Array>} - Danh sách thuốc điều trị đặc trị hàng đầu
 */
async function searchDiseaseFDAOnline(query) {
  if (!navigator.onLine) {
    throw new Error("OFFLINE");
  }

  const cacheKey = `disease_fda_${query}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  const normQuery = query.toLowerCase().trim();
  
  // Bước 1: Ánh xạ từ khóa sang tiếng Anh chuẩn từ từ điển tĩnh
  let enKeyword = diseaseDict[normQuery] || normQuery;
  
  // Bước 2: Gọi OpenFDA Count API để tìm các hoạt chất liên quan nhất (tăng giới hạn lên để lấy nhiều thuốc hơn)
  const countUrl = `https://api.fda.gov/drug/label.json?search=indications_and_usage:"${encodeURIComponent(enKeyword)}"&count=openfda.generic_name.exact&limit=25`;
  
  const countResponse = await fetch(countUrl);
  if (!countResponse.ok) {
    if (countResponse.status === 404) return [];
    throw new Error("FDA API Error");
  }
  
  const countData = await countResponse.json();
  const rawTerms = countData.results || [];
  
  // Lọc các hoạt chất rác hoặc quá chung chung và chuẩn hóa lọc trùng dạng muối hoạt chất
  const blacklist = ["WATER", "OXYGEN", "ALCOHOL", "SODIUM CHLORIDE"];
  const seenBases = new Set();
  const activeIngredients = [];
  
  for (const termObj of rawTerms) {
    const term = termObj.term;
    if (!term) continue;
    const termUpper = term.toUpperCase();
    if (blacklist.includes(termUpper)) continue;
    
    // Chuẩn hóa cơ bản để tránh trùng lặp hoạt chất dưới các dạng muối khác nhau (ví dụ Naproxen và Naproxen Sodium)
    let baseName = termUpper
      .replace(/\b(SODIUM|POTASSIUM|CALCIUM|HYDROCHLORIDE|MALEATE|TARTRATE|SULFATE|PHOSPHATE|ACETATE|MESYLATE)\b/g, '')
      .trim();
    
    if (seenBases.has(baseName)) {
      continue;
    }
    seenBases.add(baseName);
    activeIngredients.push(term);
    
    // Hiển thị tối đa 10 thuốc điều trị cho bệnh lý
    if (activeIngredients.length >= 10) {
      break;
    }
  }

  if (activeIngredients.length === 0) {
    return [];
  }

  // Bước 3: Với mỗi hoạt chất, gọi FDA Detail API để lấy thông tin nhãn chi tiết
  const formattedResults = [];
  
  await Promise.all(activeIngredients.map(async (ingredient) => {
    try {
      const detailUrl = `https://api.fda.gov/drug/label.json?search=openfda.generic_name.exact:"${encodeURIComponent(ingredient)}"&limit=1`;
      const detailResponse = await fetch(detailUrl);
      if (!detailResponse.ok) return;
      
      const detailData = await detailResponse.json();
      const item = detailData.results ? detailData.results[0] : null;
      if (!item) return;

      const openfda = item.openfda || {};
      const genericName = openfda.generic_name ? openfda.generic_name[0] : ingredient;
      const brandName = openfda.brand_name ? openfda.brand_name[0] : "";
      
      const nameEn = genericName ? `${genericName.toUpperCase()}${brandName ? ` (${brandName})` : ''}` : brandName;
      const id = ingredient.toLowerCase().replace(/[^a-z0-9]/g, "-");
      
      const pharmClass = openfda.pharm_class_epc || openfda.pharm_class_cs || [];
      const typeEn = pharmClass[0] || "Drug Information";
      
      // Lấy 4 trường quan trọng
      const rawIndications = item.indications_and_usage ? item.indications_and_usage[0] : "";
      const rawDesc = item.description ? item.description[0] : "";
      const rawUsage = item.dosage_and_administration ? item.dosage_and_administration[0] : "";
      const rawWarnings = item.warnings_and_cautions ? item.warnings_and_cautions[0] : (item.warnings ? item.warnings[0] : "");
      
      const descText = limitText(rawDesc) || "No detailed description available in FDA database.";
      const usageText = limitText(rawUsage) || "Take as directed by your doctor.";
      const warningsText = limitText(rawWarnings) || "Please consult warnings on the product label.";
      const indicationsText = limitText(rawIndications) || "Refer to doctor indications.";

      // Dịch sang tiếng Việt
      const [typeVi, descVi, usageVi, warningsVi, indicationsVi] = await Promise.all([
        translateClientSide(typeEn, 'vi'),
        translateClientSide(descText, 'vi'),
        translateClientSide(usageText, 'vi'),
        translateClientSide(warningsText, 'vi'),
        translateClientSide(indicationsText, 'vi')
      ]);

      const drugObj = {
        id: id,
        name_en: nameEn,
        name_vi: nameEn, // Giữ nguyên tên gốc Latin
        type_en: typeEn,
        type_vi: typeVi || typeEn,
        description_en: descText,
        description_vi: descVi || descText,
        usage_en: usageText,
        usage_vi: usageVi || usageText,
        warnings_en: warningsText,
        warnings_vi: warningsVi || warningsText,
        diseases_en: [enKeyword.toUpperCase()],
        diseases_vi: [query.toUpperCase()],
        isOnline: true,
        indications_en: indicationsText,
        indications_vi: indicationsVi || indicationsText
      };
      
      formattedResults.push(drugObj);
    } catch (err) {
      console.error(`Lỗi lấy thông tin chi tiết cho ${ingredient}:`, err);
    }
  }));

  // Đảm bảo thứ tự hiển thị trùng khớp với thứ tự count từ cao xuống thấp của activeIngredients ban đầu
  const sortedResults = [];
  activeIngredients.forEach(ingredient => {
    const matched = formattedResults.find(r => r.id === ingredient.toLowerCase().replace(/[^a-z0-9]/g, "-"));
    if (matched) {
      sortedResults.push(matched);
    }
  });

  searchCache.set(cacheKey, sortedResults);
  return sortedResults;
}

/**
 * Thực hiện tìm kiếm chính thức
 * @param {string} query - Chuỗi tìm kiếm
 */
async function executeSearch(query) {
  const normQuery = query.toLowerCase().trim();
  let matchedDrugs = [];

  // Xóa kết quả cũ và hiển thị trạng thái tìm kiếm
  placeholderBox.style.display = 'none';
  resultsList.innerHTML = '';
  
  if (currentTab === 'disease') {
    // ------------------------------------
    // Tab BỆNH LÝ: Luôn gọi FDA Online đếm tần suất thuốc
    // ------------------------------------
    loadingSpinner.style.display = 'flex';
    try {
      matchedDrugs = await searchDiseaseFDAOnline(query);
      loadingSpinner.style.display = 'none';
    } catch (error) {
      loadingSpinner.style.display = 'none';
      const t = UI_TRANSLATIONS[currentLang];
      if (error.message === "OFFLINE") {
        resultsList.innerHTML = `
          <div class="placeholder-text">
            <div class="placeholder-icon">⚠️</div>
            <p>${t.noConnection}</p>
          </div>
        `;
      } else {
        resultsList.innerHTML = `
          <div class="placeholder-text">
            <div class="placeholder-icon">❌</div>
            <p>Không tìm thấy kết quả phù hợp trên FDA hoặc vượt quá giới hạn lượt gọi y khoa.</p>
          </div>
        `;
      }
      return;
    }
  } else {
    // ------------------------------------
    // Tab TÊN THUỐC: Có thể tìm Online hoặc Offline
    // ------------------------------------
    if (onlineMode) {
      loadingSpinner.style.display = 'flex';
      try {
        matchedDrugs = await searchOpenFDAOnline(query, currentTab);
        loadingSpinner.style.display = 'none';
      } catch (error) {
        loadingSpinner.style.display = 'none';
        const t = UI_TRANSLATIONS[currentLang];
        if (error.message === "OFFLINE") {
          resultsList.innerHTML = `
            <div class="placeholder-text">
              <div class="placeholder-icon">⚠️</div>
              <p>${t.noConnection}</p>
            </div>
          `;
        } else {
          resultsList.innerHTML = `
            <div class="placeholder-text">
              <div class="placeholder-icon">❌</div>
              <p>${currentLang === 'vi' ? 'Không thể kết nối tới máy chủ FDA hoặc giới hạn truy cập.' : 'Failed to connect to FDA server or rate limited.'}</p>
            </div>
          `;
        }
        return;
      }
    } else {
      // Chế độ ngoại tuyến từ local DB
      matchedDrugs = Object.values(drugsDb).filter(drug => {
        const nameEn = (drug.name_en || '').toLowerCase();
        const nameVi = (drug.name_vi || '').toLowerCase();
        const typeEn = (drug.type_en || '').toLowerCase();
        const typeVi = (drug.type_vi || '').toLowerCase();
        return nameEn.includes(normQuery) || nameVi.includes(normQuery) || typeEn.includes(normQuery) || typeVi.includes(normQuery);
      });
    }
  }

  // Nếu không tìm thấy kết quả nào
  if (matchedDrugs.length === 0) {
    const t = UI_TRANSLATIONS[currentLang];
    resultsList.innerHTML = `
      <div class="placeholder-text">
        <div class="placeholder-icon">🩺</div>
        <p>${t.noResults.replace('{query}', query)}</p>
      </div>
    `;
    return;
  }

  // Nếu có nhiều thuốc, hiển thị Bộ chọn nhanh (Quick Selector)
  if (matchedDrugs.length > 1) {
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'drug-selector-container';
    
    matchedDrugs.forEach((drug, index) => {
      const drugName = currentLang === 'vi' ? (drug.name_vi || drug.name_en) : (drug.name_en || drug.name_vi);
      const shortName = drugName.split('(')[0].trim();
      
      const chip = document.createElement('button');
      chip.className = `selector-chip ${index === 0 ? 'active' : ''}`;
      chip.textContent = shortName;
      chip.onclick = () => {
        selectorContainer.querySelectorAll('.selector-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        resultsList.querySelectorAll('.card').forEach((card, cardIndex) => {
          if (cardIndex === index) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      };
      selectorContainer.appendChild(chip);
    });
    resultsList.appendChild(selectorContainer);
  }

  matchedDrugs.forEach((drug, index) => {
    const card = createDrugCard(drug);
    if (matchedDrugs.length > 1 && index > 0) {
      card.classList.add('hidden');
    }
    resultsList.appendChild(card);
  });
}

/**
 * Hỗ trợ kích hoạt nhanh tìm kiếm trực tuyến
 */
function enableOnlineAndSearch(query) {
  onlineModeCheck.checked = true;
  toggleOnlineMode();
}

/**
 * Tạo Card hiển thị thông tin thuốc song ngữ
 * @param {Object} drug - Đối tượng dữ liệu thuốc
 * @returns {HTMLElement} - Thẻ card HTML
 */
function createDrugCard(drug) {
  const card = document.createElement('article');
  card.className = 'card';
  
  const t = UI_TRANSLATIONS[currentLang];

  // Lấy các giá trị hiển thị theo ngôn ngữ hiện tại, tự động fallback nếu tiếng Việt trống
  const name = currentLang === 'vi' ? (drug.name_vi || drug.name_en) : (drug.name_en || drug.name_vi);
  const type = currentLang === 'vi' ? (drug.type_vi || drug.type_en) : (drug.type_en || drug.type_vi);
  const desc = currentLang === 'vi' ? (drug.description_vi || drug.description_en) : (drug.description_en || drug.description_vi);
  const usage = currentLang === 'vi' ? (drug.usage_vi || drug.usage_en || t.defaultUsage) : (drug.usage_en || drug.usage_vi || t.defaultUsage);
  const warnings = currentLang === 'vi' ? (drug.warnings_vi || drug.warnings_en || t.defaultWarning) : (drug.warnings_en || drug.warnings_vi || t.defaultWarning);
  
  const diseases = currentLang === 'vi' ? (drug.diseases_vi || drug.diseases_en || []) : (drug.diseases_en || drug.diseases_vi || []);

  const badgeText = drug.isOnline ? t.onlineBadge : t.offlineBadge;

  // Phần hiển thị các thẻ bệnh lý chỉ định trị liệu
  const tagsHTML = diseases
    .map(dis => `<span class="tag-item" onclick="triggerTagSearch('${dis}')">${dis}</span>`)
    .join('');

  // Lấy chi tiết chỉ định y khoa (FDA indications)
  const indicationsContent = currentLang === 'vi' ? (drug.indications_vi || drug.indications_en || "") : (drug.indications_en || drug.indications_vi || "");

  card.innerHTML = `
    <div class="card-title-container">
      <h2 class="card-title">${name}</h2>
      <span class="card-badge" style="background: ${drug.isOnline ? 'rgba(236,72,153,0.1)' : 'rgba(96,165,250,0.1)'}; border-color: ${drug.isOnline ? 'rgba(236,72,153,0.2)' : 'rgba(96,165,250,0.2)'}; color: ${drug.isOnline ? 'var(--accent)' : 'var(--primary)'}">${badgeText}</span>
    </div>
    <span class="card-badge" style="width: fit-content; margin-top: -0.5rem; text-transform: none; font-weight: 500;">${type}</span>
    
    <details class="card-section-accordion description" open>
      <summary><span>🩺 ${t.descTitle}</span></summary>
      <div class="card-section-accordion-content">${desc}</div>
    </details>
    
    <details class="card-section-accordion usage">
      <summary><span>💊 ${t.usageTitle}</span></summary>
      <div class="card-section-accordion-content">${usage}</div>
    </details>
    
    <details class="card-section-accordion warning">
      <summary><span>⚠️ ${t.warningsTitle}</span></summary>
      <div class="card-section-accordion-content">${warnings}</div>
    </details>

    ${(indicationsContent || tagsHTML) ? `
    <details class="card-section-accordion indications">
      <summary><span>🎯 ${t.indicationsTitle}</span></summary>
      <div class="card-section-accordion-content">
        ${indicationsContent ? `<p style="margin-bottom: 0.8rem; font-style: italic; line-height: 1.5; color: var(--text); opacity: 0.9;">${indicationsContent}</p>` : ''}
        ${tagsHTML ? `<div class="tag-list" style="margin-top: 0.5rem;">${tagsHTML}</div>` : ''}
      </div>
    </details>` : ''}
  `;

  return card;
}

/**
 * Tìm kiếm nhanh khi click vào nhãn chỉ định
 * @param {string} tagName - Tên bệnh lý
 */
function triggerTagSearch(tagName) {
  switchTab('disease');
  searchInput.value = tagName;
  executeSearch(tagName);
}

/**
 * Đăng ký Service Worker
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js')
      .then(reg => console.log('Đăng ký Service Worker thành công:', reg.scope))
      .catch(err => console.error('Đăng ký Service Worker thất bại:', err));
  });
}

/**
 * Cài đặt PWA
 */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`Người dùng chọn cài đặt PWA: ${outcome}`);
  deferredPrompt = null;
  installBtn.style.display = 'none';
});

window.addEventListener('appinstalled', () => {
  console.log('Ứng dụng PharmaSearch đã cài đặt thành công!');
  installBtn.style.display = 'none';
});

// Khởi chạy ứng dụng
async function initApp() {
  updateUILanguage();
  await loadDatabase();
  updateControlsVisibility(); // Cập nhật trạng thái hiển thị các nút điều khiển ban đầu
  
  // Gán các hàm sự kiện chính vào window scope để các thuộc tính inline onclick/onchange trong HTML hoạt động chính xác
  window.toggleLanguage = toggleLanguage;
  window.toggleOnlineMode = toggleOnlineMode;
  window.switchTab = switchTab;
  window.enableOnlineAndSearch = enableOnlineAndSearch;
  window.triggerTagSearch = triggerTagSearch;

  // Gán thêm Event Listeners trực tiếp bằng JS để đảm bảo tính ổn định tối đa
  if (langSwitchBtn) {
    langSwitchBtn.addEventListener('click', toggleLanguage);
  }
  if (onlineModeCheck) {
    onlineModeCheck.addEventListener('change', toggleOnlineMode);
  }
}

initApp();

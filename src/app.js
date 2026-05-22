/**
 * PharmaSearch - Ứng dụng tra cứu y khoa song ngữ ngoại tuyến & trực tuyến
 */

// Trạng thái ứng dụng
let drugsDb = {};
let diseasesIndex = {};
let currentTab = 'disease'; // 'disease' hoặc 'drug'
let currentLang = localStorage.getItem('pharma_lang') || 'vi'; // 'vi' hoặc 'en'
let onlineMode = false; // Mặc định tìm offline
let deferredPrompt = null;
const searchCache = new Map(); // Cache tìm kiếm online để tăng tốc và tiết kiệm băng thông

// Bộ dịch văn bản giao diện (UI)
const UI_TRANSLATIONS = {
  vi: {
    subtitle: "Tra cứu Thuốc & Bệnh lý ngoại tuyến",
    tabDisease: "Tìm theo Bệnh lý",
    tabDrug: "Tìm theo Tên Thuốc",
    placeholderDisease: "Nhập tên bệnh hoặc triệu chứng...",
    placeholderDrug: "Nhập tên thuốc hoặc hoạt chất...",
    onlineLabel: "Tìm trực tuyến (OpenFDA)",
    placeholderMsg: "Bắt đầu nhập từ khóa tìm kiếm để tra cứu thông tin y khoa.",
    loadingText: "Đang tải và dịch dữ liệu từ FDA...",
    noResults: "Không tìm thấy kết quả phù hợp với từ khóa \"{query}\". Bạn hãy thử bật chế độ Tìm trực tuyến phía trên.",
    installBtn: "📲 Cài đặt ứng dụng về điện thoại",
    copyright: "© 2026 PharmaSearch. Hoạt động ngoại tuyến & Miễn phí hoàn toàn.",
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
    subtitle: "Offline Medical & Drug Search",
    tabDisease: "Search by Disease",
    tabDrug: "Search by Drug Name",
    placeholderDisease: "Enter disease name or symptoms...",
    placeholderDrug: "Enter drug or active ingredient...",
    onlineLabel: "Search Online (OpenFDA)",
    placeholderMsg: "Start entering keywords to search for medical information.",
    loadingText: "Loading and retrieving data from FDA...",
    noResults: "No matching results found for \"{query}\". Try enabling Search Online above.",
    installBtn: "📲 Install application to phone",
    copyright: "© 2026 PharmaSearch. Works Offline & 100% Free.",
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
const onlineModeCheck = document.getElementById('online-mode-check');
const onlineModeLabel = document.getElementById('online-mode-label');
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
  
  // Cập nhật nhãn tìm trực tuyến
  onlineModeLabel.textContent = t.onlineLabel;
  
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
 * Bật/tắt chế độ tìm kiếm trực tuyến
 */
function toggleOnlineMode() {
  onlineMode = onlineModeCheck.checked;
  hideSuggestions();
  const query = searchInput.value.trim();
  if (query) {
    executeSearch(query);
  }
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
 * Tải cơ sở dữ liệu từ các tệp JSON tĩnh ngoại tuyến
 */
async function loadDatabase() {
  try {
    const [drugsResponse, diseasesResponse] = await Promise.all([
      fetch('data/drugs_db.json'),
      fetch('data/diseases_index.json')
    ]);

    if (!drugsResponse.ok || !diseasesResponse.ok) {
      throw new Error('Không thể đọc dữ liệu offline từ máy chủ.');
    }

    drugsDb = await drugsResponse.json();
    diseasesIndex = await diseasesResponse.json();
    console.log('Đã nạp cơ sở dữ liệu song ngữ thành công.');
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu y khoa:', error);
    placeholderMsg.textContent = currentLang === 'vi' 
      ? 'Không thể tải cơ sở dữ liệu offline. Vui lòng tải lại trang.' 
      : 'Failed to load offline database. Please reload page.';
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
    // Lọc các từ khóa bệnh lý khớp với truy vấn (trong diseasesIndex)
    matches = Object.keys(diseasesIndex).filter(key => key.includes(query));
  } else {
    // Lọc tên thuốc khớp với truy vấn dựa trên cả EN và VI
    matches = Object.values(drugsDb)
      .filter(drug => {
        const nameEn = (drug.name_en || '').toLowerCase();
        const nameVi = (drug.name_vi || '').toLowerCase();
        const typeEn = (drug.type_en || '').toLowerCase();
        const typeVi = (drug.type_vi || '').toLowerCase();
        return nameEn.includes(query) || nameVi.includes(query) || typeEn.includes(query) || typeVi.includes(query);
      })
      .map(drug => currentLang === 'vi' ? drug.name_vi : drug.name_en);
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
  const cleanQuery = query.trim().toLowerCase();
  
  if (tab === 'disease') {
    searchUrl = `https://api.fda.gov/drug/label.json?search=indications_and_usage:"${encodeURIComponent(cleanQuery)}"+OR+indications_and_usage:${encodeURIComponent(cleanQuery)}&limit=4`;
  } else {
    searchUrl = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(cleanQuery)}"+OR+openfda.brand_name:"${encodeURIComponent(cleanQuery)}"+OR+openfda.generic_name:${encodeURIComponent(cleanQuery)}&limit=4`;
  }
  
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
      diseases_en: tab === 'disease' ? [query.toUpperCase()] : [typeEn],
      diseases_vi: tab === 'disease' ? [query.toUpperCase()] : [],
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
      
      if (tab !== 'disease' && typeEn) {
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
 * Thực hiện tìm kiếm chính thức
 * @param {string} query - Chuỗi tìm kiếm
 */
async function executeSearch(query) {
  const normQuery = query.toLowerCase().trim();
  let matchedDrugs = [];

  // Xóa kết quả cũ và hiển thị trạng thái tìm kiếm
  placeholderBox.style.display = 'none';
  resultsList.innerHTML = '';
  
  if (onlineMode) {
    // ------------------------------------
    // Chế độ Tìm kiếm Trực tuyến (OpenFDA)
    // ------------------------------------
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
    // ------------------------------------
    // Chế độ Tìm kiếm Ngoại tuyến (Offline Local DB)
    // ------------------------------------
    if (currentTab === 'disease') {
      // 1. Tìm theo bệnh lý
      const matchedDiseases = Object.keys(diseasesIndex).filter(key => key.includes(normQuery));
      const drugIds = new Set();
      matchedDiseases.forEach(dis => {
        diseasesIndex[dis].forEach(d => drugIds.add(d.id));
      });

      drugIds.forEach(id => {
        if (drugsDb[id]) {
          matchedDrugs.push(drugsDb[id]);
        }
      });
    } else {
      // 2. Tìm theo tên thuốc hoặc loại thuốc
      matchedDrugs = Object.values(drugsDb).filter(drug => {
        const nameEn = (drug.name_en || '').toLowerCase();
        const nameVi = (drug.name_vi || '').toLowerCase();
        const typeEn = (drug.type_en || '').toLowerCase();
        const typeVi = (drug.type_vi || '').toLowerCase();
        return nameEn.includes(normQuery) || nameVi.includes(normQuery) || typeEn.includes(normQuery) || typeVi.includes(normQuery);
      });
    }
  }

  // Neu co nhieu thuoc, hien thi Bo chon nhanh (Quick Selector)
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

  // Lấy các giá trị hiển thị theo ngôn ngữ hiện tại
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

    ${tagsHTML ? `
    <details class="card-section-accordion indications">
      <summary><span>🎯 ${t.indicationsTitle}</span></summary>
      <div class="card-section-accordion-content">
        <div class="tag-list">${tagsHTML}</div>
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

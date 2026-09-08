const form = document.querySelector("#receipt-form");
const itemsBody = document.querySelector("#items-body");
const template = document.querySelector("#item-row-template");
const message = document.querySelector("#form-message");
const submitButton = document.querySelector("#submit-button");
const productPopover = document.querySelector("#product-search-popover");
const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 2,
});
let searchTimer;
let searchController;
let activeCodeInput = null;
let searchResults = [];
let activeResultIndex = -1;

function addItem(values = {}) {
  const row = template.content.firstElementChild.cloneNode(true);
  Object.entries(values).forEach(([key, value]) => {
    const input = row.querySelector('[data-field="' + key + '"]');
    if (input) input.value = value;
  });
  row.querySelector(".remove-row").addEventListener("click", () => {
    if (itemsBody.children.length === 1) {
      setMessage("Phiếu cần ít nhất một dòng hàng.", "error");
      return;
    }
    row.remove();
    updateRows();
  });
  const codeInput = row.querySelector('[data-field="itemCode"]');
  codeInput.addEventListener("input", () => scheduleProductSearch(codeInput));
  codeInput.addEventListener("focus", () => {
    if (codeInput.value.trim()) scheduleProductSearch(codeInput, 0);
  });
  codeInput.addEventListener("keydown", handleProductSearchKeydown);
  row.addEventListener("input", updateRows);
  itemsBody.append(row);
  updateRows();
}

function scheduleProductSearch(input, delay = 250) {
  clearTimeout(searchTimer);
  searchController?.abort();
  activeCodeInput = input;
  activeResultIndex = -1;
  const query = input.value.trim();
  if (!query) {
    hideProductSearch();
    return;
  }
  showProductSearchState("Đang tìm hàng hóa...");
  searchTimer = setTimeout(() => searchProducts(query, input), delay);
}

async function searchProducts(query, input) {
  searchController = new AbortController();
  try {
    const response = await fetch(
      "/api/products?q=" + encodeURIComponent(query) + "&limit=10",
      { signal: searchController.signal },
    );
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (input !== activeCodeInput || input.value.trim() !== query) return;
    searchResults = result.data;
    renderProductResults();
  } catch (error) {
    if (error.name !== "AbortError") {
      showProductSearchState("Không thể tìm hàng hóa. Vui lòng thử lại.");
    }
  }
}

function renderProductResults() {
  productPopover.replaceChildren();
  if (!searchResults.length) {
    showProductSearchState(
      "Không có kết quả. Mã mới sẽ được thêm vào danh mục khi lưu phiếu.",
    );
    return;
  }
  searchResults.forEach((product, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.id = "product-option-" + index;
    option.className = "product-option";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(index === activeResultIndex));
    const code = document.createElement("code");
    code.textContent = product.code;
    const name = document.createElement("span");
    name.textContent = product.name;
    const price = document.createElement("small");
    price.textContent = currency.format(product.defaultPrice);
    option.append(code, name, price);
    option.addEventListener("mousedown", (event) => event.preventDefault());
    option.addEventListener("click", () => selectProduct(product));
    productPopover.append(option);
  });
  showProductPopover();
}

function showProductSearchState(text) {
  productPopover.replaceChildren();
  const state = document.createElement("p");
  state.className = "product-search-state";
  state.textContent = text;
  productPopover.append(state);
  showProductPopover();
}

function showProductPopover() {
  if (!activeCodeInput) return;
  productPopover.hidden = false;
  activeCodeInput.setAttribute("aria-expanded", "true");
  const rect = activeCodeInput.getBoundingClientRect();
  productPopover.style.left =
    Math.min(rect.left, window.innerWidth - productPopover.offsetWidth - 8) + "px";
  const below = rect.bottom + 5;
  const top = below + productPopover.offsetHeight <= window.innerHeight
    ? below
    : Math.max(8, rect.top - productPopover.offsetHeight - 5);
  productPopover.style.top = top + "px";
}

function hideProductSearch() {
  clearTimeout(searchTimer);
  searchController?.abort();
  activeCodeInput?.setAttribute("aria-expanded", "false");
  activeCodeInput?.removeAttribute("aria-activedescendant");
  productPopover.hidden = true;
  productPopover.replaceChildren();
  activeCodeInput = null;
  searchResults = [];
  activeResultIndex = -1;
}

function handleProductSearchKeydown(event) {
  if (productPopover.hidden) return;
  if (event.key === "Escape") {
    hideProductSearch();
    return;
  }
  if (!searchResults.length) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeResultIndex = (activeResultIndex + 1) % searchResults.length;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeResultIndex = (activeResultIndex - 1 + searchResults.length) % searchResults.length;
  } else if (event.key === "Enter" && activeResultIndex >= 0) {
    event.preventDefault();
    selectProduct(searchResults[activeResultIndex]);
    return;
  } else {
    return;
  }
  productPopover.querySelectorAll(".product-option").forEach((option, index) => {
    const selected = index === activeResultIndex;
    option.classList.toggle("is-active", selected);
    option.setAttribute("aria-selected", String(selected));
    if (selected) option.scrollIntoView({ block: "nearest" });
  });
  activeCodeInput.setAttribute(
    "aria-activedescendant",
    "product-option-" + activeResultIndex,
  );
}

function selectProduct(product) {
  if (!activeCodeInput) return;
  const row = activeCodeInput.closest(".item-row");
  activeCodeInput.value = product.code;
  row.querySelector('[data-field="itemName"]').value = product.name;
  row.querySelector('[data-field="unit"]').value = product.defaultUnit;
  row.querySelector('[data-field="unitPrice"]').value = product.defaultPrice;
  hideProductSearch();
  updateRows();
  row.querySelector('[data-field="quantityActual"]').focus();
}

function roundAmount(quantity, price) {
  const quantityThousandths = Math.round((quantity + Number.EPSILON) * 1000);
  const priceCents = Math.round((price + Number.EPSILON) * 100);
  return Math.round(quantityThousandths * priceCents / 1000) / 100;
}

function updateRows() {
  let totalCents = 0;
  [...itemsBody.children].forEach((row, index) => {
    row.querySelector(".row-number").textContent = String(index + 1);
    const quantity = Number(row.querySelector('[data-field="quantityActual"]').value) || 0;
    const price = Number(row.querySelector('[data-field="unitPrice"]').value) || 0;
    const amount = roundAmount(quantity, price);
    totalCents += Math.round(amount * 100);
    row.querySelector(".line-amount").textContent = currency.format(amount);
  });
  const total = totalCents / 100;
  document.querySelector("#table-total").textContent = currency.format(total);
  document.querySelector("#amount-words").textContent =
    numberToVietnameseWords(Math.round(total)) + " đồng";
  document.querySelector("#item-count").textContent =
    itemsBody.children.length + " mặt hàng";
  document.querySelector("#draft-status").textContent = "Bản nháp chưa lưu";
}

function readItems() {
  return [...itemsBody.children].map((row) => {
    const get = (name) =>
      row.querySelector('[data-field="' + name + '"]').value.trim();
    return {
      itemName: get("itemName"),
      itemCode: get("itemCode") || undefined,
      unit: get("unit"),
      quantityDocument: Number(get("quantityDocument")),
      quantityActual: Number(get("quantityActual")),
      unitPrice: Number(get("unitPrice")),
    };
  });
}

function formPayload() {
  const value = (name) => form.elements.namedItem(name).value.trim();
  return {
    receiptDate: value("receiptDate"),
    documentNumber: value("documentNumber") || undefined,
    documentDate: value("documentDate") || undefined,
    supplierName: value("supplierName"),
    supplierAddress: value("supplierAddress"),
    supplierTaxCode: value("supplierTaxCode") || undefined,
    delivererName: value("delivererName"),
    deliveryReason: value("deliveryReason"),
    warehouseName: value("warehouseName"),
    warehouseAddress: value("warehouseAddress"),
    debitAccount: value("debitAccount"),
    creditAccount: value("creditAccount"),
    notes: value("notes") || undefined,
    items: readItems(),
  };
}

function validateClient() {
  clearErrors();
  let valid = form.checkValidity();
  form.querySelectorAll("[name][required]").forEach((input) => {
    if (!input.validity.valid) {
      input.setAttribute("aria-invalid", "true");
      const error = form.querySelector(
        '[data-error-for="' + input.name + '"]',
      );
      if (error) error.textContent = "Vui lòng nhập trường này";
    }
  });
  itemsBody.querySelectorAll("[required]").forEach((input) => {
    if (!input.validity.valid || !input.value.trim()) {
      input.setAttribute("aria-invalid", "true");
      valid = false;
    }
  });
  return valid;
}

function clearErrors() {
  form
    .querySelectorAll('[aria-invalid="true"]')
    .forEach((input) => input.removeAttribute("aria-invalid"));
  form
    .querySelectorAll(".field-error")
    .forEach((node) => (node.textContent = ""));
}

function setMessage(text, kind = "") {
  message.textContent = text;
  message.className = kind;
}

async function submitReceipt(event) {
  event.preventDefault();
  if (!validateClient()) {
    setMessage("Vui lòng kiểm tra các trường bắt buộc.", "error");
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  submitButton.disabled = true;
  submitButton.textContent = "Đang lưu...";
  setMessage("Đang lưu phiếu vào hệ thống...");
  try {
    const response = await fetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload()),
    });
    const result = await response.json();
    if (!response.ok) {
      const errorMessage = typeof result.error === "string"
        ? result.error
        : result.error?.message;
      throw new Error(errorMessage || "Không thể lưu phiếu");
    }
    setMessage(
      "Đã lưu phiếu " + result.data.receiptNumber + " thành công.",
      "success",
    );
    document.querySelector("#draft-status").textContent = "Đã lưu";
    document.querySelector("#receiptNumber").value = result.data.receiptNumber;
    await loadRecentReceipts();
  } catch (error) {
    setMessage(error.message || "Có lỗi xảy ra khi lưu phiếu.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Lưu phiếu nhập";
  }
}

async function loadRecentReceipts() {
  const target = document.querySelector("#recent-content");
  target.innerHTML = '<p class="muted">Đang tải dữ liệu...</p>';
  try {
    const response = await fetch("/api/receipts?limit=10");
    if (!response.ok) throw new Error();
    const { data } = await response.json();
    if (!data.length) {
      target.innerHTML =
        '<div class="empty-state">Chưa có phiếu nhập kho. Phiếu đầu tiên sẽ xuất hiện ở đây sau khi lưu.</div>';
      return;
    }
    const list = document.createElement("div");
    list.className = "recent-list";
    data.forEach((receipt) => {
      const item = document.createElement("article");
      item.className = "recent-item";
      item.innerHTML =
        "<div><strong>" +
        escapeHtml(receipt.receiptNumber) +
        "</strong><small>" +
        formatDate(receipt.receiptDate) +
        "</small></div><div><span>" +
        escapeHtml(receipt.supplierName) +
        "</span><small>" +
        receipt.itemCount +
        " mặt hàng</small></div><div><span>" +
        escapeHtml(receipt.warehouseName) +
        '</span><small>Kho nhập</small></div><div class="money">' +
        currency.format(receipt.totalAmount) +
        "</div>";
      list.append(item);
    });
    target.replaceChildren(list);
  } catch {
    target.innerHTML =
      '<div class="empty-state">Không tải được danh sách. Hãy kiểm tra kết nối máy chủ.</div>';
  }
}

function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  return String(value).replace(/[&<>"]/g, (char) => entities[char]);
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  return day + "/" + month + "/" + year;
}

function numberToVietnameseWords(number) {
  if (!Number.isFinite(number) || number === 0) return "Không";
  const digits = [
    "không", "một", "hai", "ba", "bốn",
    "năm", "sáu", "bảy", "tám", "chín",
  ];
  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const readBlock = (block, full) => {
    const hundred = Math.floor(block / 100);
    const ten = Math.floor((block % 100) / 10);
    const one = block % 10;
    const words = [];
    if (hundred || full) words.push(digits[hundred], "trăm");
    if (ten > 1) words.push(digits[ten], "mươi");
    else if (ten === 1) words.push("mười");
    else if (one && (hundred || full)) words.push("lẻ");
    if (one) {
      if (one === 1 && ten > 1) words.push("mốt");
      else if (one === 5 && ten > 0) words.push("lăm");
      else words.push(digits[one]);
    }
    return words.join(" ");
  };
  const blocks = [];
  let remaining = Math.abs(Math.trunc(number));
  while (remaining > 0) {
    blocks.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }
  const words = [];
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (!block) continue;
    words.push(
      readBlock(block, index < blocks.length - 1 && block < 100),
      units[index] || "",
    );
  }
  const result = words.filter(Boolean).join(" ").replace(/\s+/g, " ");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

document.querySelector("#add-item").addEventListener("click", () => addItem());
document
  .querySelector("#print-button")
  .addEventListener("click", () => window.print());
document
  .querySelector("#refresh-receipts")
  .addEventListener("click", loadRecentReceipts);
document.addEventListener("pointerdown", (event) => {
  if (
    !productPopover.hidden &&
    !productPopover.contains(event.target) &&
    event.target !== activeCodeInput
  ) {
    hideProductSearch();
  }
});
window.addEventListener("resize", hideProductSearch);
document.addEventListener("scroll", hideProductSearch, true);
form.addEventListener("submit", submitReceipt);
form.addEventListener("input", () => {
  if (!message.classList.contains("success")) setMessage("");
});

const today = new Date();
document.querySelector("#receiptDate").value = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");
addItem({ unit: "Cái" });
loadRecentReceipts();

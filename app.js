import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, getFirestore, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const OWNER = "lukshaolga1982@gmail.com";
const firebaseConfig = {
  apiKey: "AIzaSyCS82yUDIe3f0u_FAppo2j4tHEaOiTdj0M",
  authDomain: "books-cdb85.firebaseapp.com",
  projectId: "books-cdb85",
  storageBucket: "books-cdb85.firebasestorage.app",
  messagingSenderId: "329453613073",
  appId: "1:329453613073:web:3aef47b2f047f63eac81b0",
  measurementId: "G-07VG2B49H7"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const database = getFirestore(firebaseApp);
const stateDocument = doc(database, "gymnasium", "orders");
const $ = (selector) => document.querySelector(selector);
const money = (value) => `${Number(value || 0).toFixed(2).replace(".", ",")} руб.`;
const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (symbol) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[symbol]);

let data = { units: [] };
let activeId = "";
let selectedSubject = "Все предметы";
let searchText = "";
let newUnitType = "class";
let saveTimer;

function activeUnit() { return data.units.find((unit) => unit.id === activeId); }
function unitTotal(unit) { return unit.lines.reduce((sum, line) => sum + line.price * line.quantity, 0); }

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#loginButton");
  const message = $("#loginMessage");
  button.disabled = true;
  button.textContent = "Выполняется вход…";
  message.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("#email").value.trim(), $("#password").value);
  } catch (error) {
    const code = error?.code || "unknown";
    message.textContent = code.includes("invalid-credential") ? "Неверный адрес или пароль" : `Ошибка входа: ${code}`;
  } finally {
    button.disabled = false;
    button.textContent = "Войти";
  }
});

$("#logoutButton").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  const authorized = user?.email?.toLowerCase() === OWNER;
  $("#loginScreen").hidden = authorized;
  $("#application").hidden = !authorized;
  if (!authorized) {
    if (user) await signOut(auth);
    return;
  }
  try {
    const snapshot = await getDoc(stateDocument);
    data = snapshot.exists() ? snapshot.data() : { units: [] };
    if (!Array.isArray(data.units)) data = { units: [] };
    activeId = data.units[0]?.id || "";
    render();
    $("#saveStatus").textContent = "Все изменения сохранены";
  } catch (error) {
    $("#content").innerHTML = `<div class="error-card">Не удалось открыть базу данных: ${escapeHtml(error?.code || error?.message || "неизвестная ошибка")}. Проверьте создание Firestore и опубликованные правила.</div>`;
    $("#saveStatus").textContent = "Ошибка загрузки";
  }
});

function scheduleSave() {
  clearTimeout(saveTimer);
  $("#saveStatus").textContent = "Сохраняю…";
  saveTimer = setTimeout(async () => {
    try {
      await setDoc(stateDocument, data);
      $("#saveStatus").textContent = "Все изменения сохранены";
    } catch (error) {
      $("#saveStatus").textContent = `Ошибка: ${error?.code || "не удалось сохранить"}`;
    }
  }, 500);
}

function updateUnit(patch) {
  data.units = data.units.map((unit) => unit.id === activeId ? { ...unit, ...patch } : unit);
  render();
  scheduleSave();
}

function render() {
  const unit = activeUnit();
  const total = data.units.reduce((sum, item) => sum + unitTotal(item), 0);
  $("#summary").innerHTML = `
    <div><span>Классов и групп</span><b>${data.units.length}</b></div>
    <div><span>Всего учащихся</span><b>${data.units.reduce((sum, item) => sum + item.students, 0)}</b></div>
    <div class="total"><span>Общая сумма заказа</span><b>${money(total)}</b></div>
    <button id="printButton">Распечатать итог</button>`;
  $("#printButton").onclick = () => window.print();

  $("#units").innerHTML = data.units.map((item) => `
    <button class="unit ${item.id === activeId ? "active" : ""}" data-unit="${item.id}">
      <i>${item.grade}</i><span><b>${escapeHtml(item.name)}</b><small>${item.type === "group" ? "Группа" : "Класс"} · ${item.students} чел.</small></span><em>${money(unitTotal(item))}</em>
    </button>`).join("");
  document.querySelectorAll("[data-unit]").forEach((button) => button.onclick = () => {
    activeId = button.dataset.unit;
    selectedSubject = "Все предметы";
    searchText = "";
    render();
  });

  if (!unit) {
    $("#content").innerHTML = `<div class="empty"><h2>Добавьте первый класс</h2><p>Укажите количество учащихся, затем выберите нужные пособия.</p><button id="emptyAdd" class="primary">Добавить класс или группу</button></div>`;
    $("#emptyAdd").onclick = openDialog;
    return;
  }

  const gradeItems = CATALOG.filter((item) => item.grade === unit.grade);
  const subjects = ["Все предметы", ...new Set(gradeItems.map((item) => item.subject))];
  const visibleItems = gradeItems.filter((item) => (selectedSubject === "Все предметы" || item.subject === selectedSubject) && `${item.title} ${item.code}`.toLowerCase().includes(searchText.toLowerCase()));
  $("#content").innerHTML = `
    <div class="unit-head"><div><small>${unit.type === "group" ? "Учебная группа" : `${unit.grade} класс`}</small><input class="name" id="unitNameEdit" value="${escapeHtml(unit.name)}"></div><label>Учащихся<input id="studentCount" type="number" min="0" value="${unit.students}"></label><button id="deleteButton" class="delete">Удалить</button></div>
    <div class="cards"><div><span>Набор на одного ученика</span><b>${money(unit.students ? unitTotal(unit) / unit.students : 0)}</b></div><div><span>Заказ для ${escapeHtml(unit.name)}</span><b>${money(unitTotal(unit))}</b></div></div>
    <div class="catalog-head"><div><h2>Пособия для ${unit.grade} класса</h2><p>Прайс актуален на 7 августа 2026 года</p></div><input id="searchInput" placeholder="Поиск по названию или коду…" value="${escapeHtml(searchText)}"></div>
    <div class="tabs">${subjects.map((subject) => `<button data-subject="${escapeHtml(subject)}" class="${subject === selectedSubject ? "active" : ""}">${escapeHtml(subject)}</button>`).join("")}</div>
    <div class="books">${visibleItems.map((item) => renderBook(item, unit)).join("")}</div>`;
  bindContent(unit);
}

function renderBook(item, unit) {
  const line = unit.lines.find((entry) => entry.itemId === item.id);
  return `<article class="book ${line ? "selected" : ""}"><button class="check" data-toggle="${item.id}">${line ? "✓" : ""}</button><div class="book-name"><small>${escapeHtml(item.subject)} · код ${escapeHtml(item.code)}</small><b>${escapeHtml(item.title)}</b></div><label>Цена<input data-price="${item.id}" type="number" min="0" step="0.01" ${line ? "" : "disabled"} value="${line?.price ?? item.price}"></label><label>Заказывают<input data-quantity="${item.id}" type="number" min="0" max="${unit.students}" ${line ? "" : "disabled"} value="${line?.quantity ?? 0}"></label><div class="line-total"><small>Сумма</small><b>${money(line ? line.price * line.quantity : 0)}</b></div></article>`;
}

function bindContent(unit) {
  $("#unitNameEdit").onchange = (event) => updateUnit({ name: event.target.value.trim() || unit.name });
  $("#studentCount").onchange = (event) => updateUnit({ students: Math.max(0, Number(event.target.value)) });
  $("#deleteButton").onclick = () => {
    if (!confirm(`Удалить «${unit.name}»?`)) return;
    data.units = data.units.filter((item) => item.id !== unit.id);
    activeId = data.units[0]?.id || "";
    render(); scheduleSave();
  };
  $("#searchInput").oninput = (event) => { searchText = event.target.value; render(); };
  document.querySelectorAll("[data-subject]").forEach((button) => button.onclick = () => { selectedSubject = button.dataset.subject; render(); });
  document.querySelectorAll("[data-toggle]").forEach((button) => button.onclick = () => {
    const item = CATALOG.find((entry) => entry.id === button.dataset.toggle);
    const exists = unit.lines.some((line) => line.itemId === item.id);
    updateUnit({ lines: exists ? unit.lines.filter((line) => line.itemId !== item.id) : [...unit.lines, { itemId: item.id, quantity: unit.students, price: item.price }] });
  });
  document.querySelectorAll("[data-price]").forEach((input) => input.onchange = () => updateLine(unit, input.dataset.price, { price: Math.max(0, Number(input.value)) }));
  document.querySelectorAll("[data-quantity]").forEach((input) => input.onchange = () => updateLine(unit, input.dataset.quantity, { quantity: Math.min(unit.students, Math.max(0, Number(input.value))) }));
}

function updateLine(unit, itemId, patch) {
  updateUnit({ lines: unit.lines.map((line) => line.itemId === itemId ? { ...line, ...patch } : line) });
}

function openDialog() { $("#unitDialog").showModal(); $("#unitName").focus(); }
$("#addTop").onclick = openDialog;
$("#addBottom").onclick = openDialog;
$("#closeDialog").onclick = () => $("#unitDialog").close();
[5, 6, 7, 8, 9, 10, 11].forEach((grade) => $("#unitGrade").add(new Option(grade, grade)));
document.querySelectorAll("[data-type]").forEach((button) => button.onclick = () => {
  newUnitType = button.dataset.type;
  document.querySelectorAll("[data-type]").forEach((item) => item.classList.toggle("active", item === button));
  $("#unitName").placeholder = newUnitType === "class" ? "Например, 5А" : "Например, 5А — английский, группа 1";
});
$("#unitForm").onsubmit = (event) => {
  event.preventDefault();
  const name = $("#unitName").value.trim();
  if (!name) return;
  const unit = { id: crypto.randomUUID(), name, grade: Number($("#unitGrade").value), students: Math.max(0, Number($("#unitStudents").value)), type: newUnitType, lines: [] };
  data.units.push(unit);
  activeId = unit.id;
  $("#unitName").value = "";
  $("#unitDialog").close();
  render(); scheduleSave();
};

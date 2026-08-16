"use client";

import { useEffect, useMemo, useState } from "react";
import { catalog } from "./catalog";

type Line = { itemId: string; quantity: number; price: number };
type Unit = { id: string; name: string; grade: number; students: number; type: "class" | "group"; lines: Line[] };
type Data = { units: Unit[]; customItems: never[] };
const blank: Data = { units: [], customItems: [] };
const rub = (n: number) => `${n.toFixed(2).replace(".", ",")} руб.`;

export default function OrderApp() {
  const [data, setData] = useState<Data>(blank);
  const [activeId, setActiveId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("Загрузка…");
  const [modal, setModal] = useState(false);
  const [draft, setDraft] = useState({ name: "", grade: 5, students: 25, type: "class" as "class" | "group" });
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("Все предметы");

  useEffect(() => { fetch("/api/state").then(r => r.json()).then((d: Data) => { setData(d); setActiveId(d.units[0]?.id || ""); }).finally(() => setLoaded(true)); }, []);
  useEffect(() => { if (!loaded) return; setStatus("Сохраняю…"); const t = setTimeout(() => fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }).then(r => setStatus(r.ok ? "Все изменения сохранены" : "Не удалось сохранить")).catch(() => setStatus("Не удалось сохранить")), 500); return () => clearTimeout(t); }, [data, loaded]);

  const active = data.units.find(u => u.id === activeId);
  const items = useMemo(() => active ? catalog.filter(i => i.grade === active.grade) : [], [active]);
  const subjects = ["Все предметы", ...Array.from(new Set(items.map(i => i.subject)))];
  const shown = items.filter(i => (subject === "Все предметы" || i.subject === subject) && `${i.title} ${i.code}`.toLowerCase().includes(search.toLowerCase()));
  const total = (u: Unit) => u.lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const overall = data.units.reduce((s, u) => s + total(u), 0);

  const update = (patch: Partial<Unit>) => active && setData(d => ({ ...d, units: d.units.map(u => u.id === active.id ? { ...u, ...patch } : u) }));
  const create = () => { if (!draft.name.trim()) return; const u: Unit = { ...draft, name: draft.name.trim(), id: crypto.randomUUID(), lines: [] }; setData(d => ({ ...d, units: [...d.units, u] })); setActiveId(u.id); setDraft({ name: "", grade: 5, students: 25, type: "class" }); setModal(false); };
  const toggle = (id: string, price: number) => { if (!active) return; const has = active.lines.some(l => l.itemId === id); update({ lines: has ? active.lines.filter(l => l.itemId !== id) : [...active.lines, { itemId: id, quantity: active.students, price }] }); };
  const updateLine = (id: string, patch: Partial<Line>) => active && update({ lines: active.lines.map(l => l.itemId === id ? { ...l, ...patch } : l) });
  const remove = () => { if (!active || !confirm(`Удалить «${active.name}»?`)) return; const units = data.units.filter(u => u.id !== active.id); setData(d => ({ ...d, units })); setActiveId(units[0]?.id || ""); };

  return <main className="app">
    <header><div className="logo">БГ</div><div><p>Браславская гимназия имени И. Н. Волчкова</p><h1>Заказ рабочих тетрадей</h1></div><span className="save"><i />{status}</span></header>
    <section className="summary"><div><span>Классов и групп</span><b>{data.units.length}</b></div><div><span>Всего учащихся</span><b>{data.units.reduce((s,u) => s + u.students, 0)}</b></div><div className="sum"><span>Общая сумма заказа</span><b>{rub(overall)}</b></div><button onClick={() => print()}>Распечатать итог</button></section>
    <div className="layout">
      <aside><div className="aside-title"><span><b>Мои списки</b><small>Классы и учебные группы</small></span><button onClick={() => setModal(true)}>+</button></div><nav>{data.units.map(u => <button className={u.id === activeId ? "unit active" : "unit"} onClick={() => {setActiveId(u.id);setSubject("Все предметы")}} key={u.id}><i>{u.grade}</i><span><b>{u.name}</b><small>{u.type === "group" ? "Группа" : "Класс"} · {u.students} чел.</small></span><em>{rub(total(u))}</em></button>)}</nav>{!data.units.length && loaded && <div className="aside-empty">Пока нет списков</div>}<button className="add" onClick={() => setModal(true)}>＋ Добавить класс или группу</button></aside>
      <section className="content">{!active ? <div className="welcome"><span>▥</span><h2>Начните с первого класса</h2><p>Укажите класс или учебную группу, а затем выберите нужные пособия из прайс-листа.</p><button onClick={() => setModal(true)}>Добавить список</button></div> : <>
        <div className="unit-head"><div><small>{active.type === "group" ? "Учебная группа" : `${active.grade} класс`}</small><input value={active.name} onChange={e => update({name:e.target.value})}/></div><label>Количество учащихся<input type="number" min="0" value={active.students} onChange={e => update({students:Math.max(0,+e.target.value)})}/></label><button onClick={remove}>Удалить</button></div>
        <div className="cards"><div><span>Набор на одного ученика</span><b>{rub(active.students ? total(active)/active.students : 0)}</b><small>средняя сумма по классу</small></div><div><span>Заказ для {active.name}</span><b>{rub(total(active))}</b><small>{active.lines.length} позиций выбрано</small></div></div>
        <div className="catalog-title"><div><h2>Пособия для {active.grade} класса</h2><p>Прайс актуален на 7 августа 2026 года</p></div><input placeholder="Поиск по названию или коду…" value={search} onChange={e => setSearch(e.target.value)}/></div>
        <div className="tabs">{subjects.map(s => <button className={s === subject ? "active" : ""} key={s} onClick={() => setSubject(s)}>{s}</button>)}</div>
        <div className="books">{shown.map(i => {const l=active.lines.find(x=>x.itemId===i.id); return <article className={l?"selected":""} key={i.id}><button className="check" onClick={()=>toggle(i.id,i.price)}>{l?"✓":""}</button><div className="book-name"><small>{i.subject} · код {i.code}</small><b>{i.title}</b></div><label>Цена<input type="number" step="0.01" disabled={!l} value={l?.price??i.price} onChange={e=>updateLine(i.id,{price:+e.target.value})}/></label><label>Заказывают<input type="number" min="0" max={active.students} disabled={!l} value={l?.quantity??0} onChange={e=>updateLine(i.id,{quantity:Math.min(active.students,Math.max(0,+e.target.value))})}/></label><div className="line-sum"><span>Сумма</span><b>{rub(l?l.price*l.quantity:0)}</b></div></article>})}</div>
      </>}</section>
    </div>
    {modal && <div className="backdrop" onMouseDown={()=>setModal(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setModal(false)}>×</button><h2>Новый класс или группа</h2><p>У каждого списка будет свой комплект пособий.</p><div className="switch"><button className={draft.type==="class"?"active":""} onClick={()=>setDraft({...draft,type:"class"})}>Класс</button><button className={draft.type==="group"?"active":""} onClick={()=>setDraft({...draft,type:"group"})}>Учебная группа</button></div><label>Название<input autoFocus placeholder={draft.type==="class"?"Например, 5А":"Например, 5А — английский, группа 1"} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><div className="modal-row"><label>Параллель<select value={draft.grade} onChange={e=>setDraft({...draft,grade:+e.target.value})}>{[5,6,7,8,9,10,11].map(g=><option key={g}>{g}</option>)}</select></label><label>Учащихся<input type="number" min="0" value={draft.students} onChange={e=>setDraft({...draft,students:+e.target.value})}/></label></div><button className="primary" onClick={create}>Создать список</button></div></div>}
  </main>;
}

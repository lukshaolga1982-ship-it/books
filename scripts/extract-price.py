import json
import re
from pathlib import Path

import pdfplumber

source = Path("/workspace/scratch/abbd0249c6b6/upload/Прайс 5-11 классы.pdf")
target = Path("app/catalog.ts")
grade = None
subject = "Другое"
items = []

with pdfplumber.open(source) as pdf:
    for page in pdf.pages:
        for table in page.extract_tables():
            for row in table:
                cells = [(value or "").strip() for value in row]
                joined = " ".join(value for value in cells if value)
                grade_match = re.fullmatch(r"(5|6|7|8|9|10|11)\s+класс", joined)
                if grade_match:
                    grade = int(grade_match.group(1))
                    subject = "Другое"
                    continue
                code_index = next((i for i, value in enumerate(cells) if re.fullmatch(r"[аaАAuU]?\d[\d_]*", value)), None)
                code = cells[code_index] if code_index is not None else ""
                title = ""
                if code_index is not None:
                    title = next((value for value in cells[code_index + 1:] if len(value) > 3 and not re.fullmatch(r"\d{4}|\d+[,.]\d{2}", value)), "")
                if not code and joined and "Код" not in joined and grade:
                    label = joined.replace("\n", " ").strip()
                    if len(label) < 90 and not re.search(r"\d", label):
                        subject = label
                    continue
                if not grade or not code or not title:
                    continue
                price_text = next((value for value in reversed(cells) if re.fullmatch(r"\d+[,.]\d{2}", value)), "")
                if not price_text:
                    continue
                title = re.sub(r"\s+", " ", title.replace("\n", " ")).strip()
                items.append({"id": f"price-{len(items)}", "grade": grade, "subject": subject, "code": code, "title": title, "price": float(price_text.replace(",", "."))})

content = "export type CatalogItem = { id: string; grade: number; subject: string; code: string; title: string; price: number };\n\n"
content += "export const catalog: CatalogItem[] = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n"
target.write_text(content, encoding="utf-8")
print(f"Extracted {len(items)} priced items")

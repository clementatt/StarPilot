#!/usr/bin/env python3
"""检查某个语言的 .po 里还有哪些条目没有翻译。

和 update_translations.py 用同一套来源（UI 代码里的 tr()/trn()/tr_noop() 与
starpilot/ui/translation_messages.json 登记表）计算“当前应有的文案”，再与 .po 对比：

  未翻译  .po 里有这条，但译文为空
  未收录  代码/登记表里有，但 .po 里还没有这条（需要先合并再翻译）
  过时    .po 里有，但代码/登记表里已不存在（不影响显示，默认不计入）
  同英文  已填译文但与英文完全相同（多数是 ACC、PiP 等刻意保留，仅供参考）

按引用来源把条目分为 native（设备原生 UI 与驾驶警报）、galaxy（手机端 Galaxy）、other。
同时被两边引用的条目算作 native，因为它会显示在设备上。

只依赖标准库和 potools，可直接用系统 Python 运行：
  python3 openpilot/selfdrive/ui/translations/check_untranslated.py
  python3 openpilot/selfdrive/ui/translations/check_untranslated.py --scope native --list --limit 0
  python3 openpilot/selfdrive/ui/translations/check_untranslated.py --scope galaxy --by-file
  python3 openpilot/selfdrive/ui/translations/check_untranslated.py --json /tmp/todo.json --strict
"""
import argparse
import json
import os
import sys
import unicodedata
from collections import Counter
from pathlib import Path

TRANSLATIONS_DIR = Path(__file__).resolve().parent
ROOT = TRANSLATIONS_DIR.parents[3]
if str(ROOT) not in sys.path:
  sys.path.insert(0, str(ROOT))

from openpilot.selfdrive.ui.translations.potools import POEntry, extract_strings, parse_po  # noqa: E402

REGISTRY = ROOT / "openpilot/starpilot/ui/translation_messages.json"
SCOPES = {
  "native": ("openpilot/starpilot/ui/", "openpilot/selfdrive/selfdrived/", "openpilot/selfdrive/ui/", "openpilot/system/ui/"),
  "galaxy": ("openpilot/starpilot/galaxy/",),
}
SCOPE_ORDER = ("native", "galaxy", "other")
STATUS_LABEL = {"untranslated": "未翻译", "missing": "未收录", "stale": "过时", "same": "同英文"}


def current_catalog() -> dict[str, POEntry]:
  """与 update_translations.py 相同的提取范围，但不导入运行时依赖。"""
  files = []
  for base in ("openpilot/system/ui", "openpilot/selfdrive/ui/widgets", "openpilot/selfdrive/ui/layouts", "openpilot/selfdrive/ui/onroad"):
    for dirpath, _, names in os.walk(ROOT / base):
      files += [os.path.relpath(os.path.join(dirpath, name), ROOT) for name in names if name.endswith(".py")]
  files.append("openpilot/starpilot/ui/translation_strings.py")
  entries = {entry.msgid: entry for entry in extract_strings(sorted(files), str(ROOT))}
  for row in json.loads(REGISTRY.read_text(encoding="utf-8"))["messages"]:
    if row["source"] in entries:
      entries[row["source"]].source_refs = sorted(set(entries[row["source"]].source_refs + row["refs"]))
    else:
      entries[row["source"]] = POEntry(msgid=row["source"], source_refs=list(row["refs"]))
  return entries


def ref_files(entry: POEntry) -> list[str]:
  return sorted({ref.rsplit(":", 1)[0] if ref.rsplit(":", 1)[-1].isdigit() else ref for ref in entry.source_refs})


def scope_of(refs: list[str]) -> str:
  for name in ("native", "galaxy"):
    if any(ref.startswith(prefix) for ref in refs for prefix in SCOPES[name]):
      return name
  return "other"


def translated(entry: POEntry) -> bool:
  if entry.is_plural:
    return bool(entry.msgstr_plural) and all(entry.msgstr_plural.values())
  return bool(entry.msgstr)


def classify(po_path: Path) -> list[dict]:
  _, po_entries = parse_po(po_path)
  po = {entry.msgid: entry for entry in po_entries}
  current = current_catalog()
  rows = []
  for msgid in sorted(set(po) | set(current)):
    entry = po.get(msgid) or current[msgid]
    refs = ref_files(current[msgid] if msgid in current else entry)
    if msgid not in current:
      status = "stale"
    elif msgid not in po:
      status = "missing"
    elif not translated(entry):
      status = "untranslated"
    elif not entry.is_plural and entry.msgstr == msgid:
      status = "same"
    else:
      status = "ok"
    row = {"msgid": msgid, "status": status, "scope": scope_of(refs), "refs": refs}
    if entry.msgid_plural:
      row["msgid_plural"] = entry.msgid_plural
    rows.append(row)
  return rows


def width(text: str) -> int:
  return sum(2 if unicodedata.east_asian_width(char) in "WF" else 1 for char in text)


def pad(text: str, size: int) -> str:
  return text + " " * max(0, size - width(text))


def main(argv=None) -> int:
  parser = argparse.ArgumentParser(description="检查 .po 中尚未翻译的条目")
  parser.add_argument("--lang", default="zh-CHS", help="语言代码，对应 app_<lang>.po（默认 zh-CHS）")
  parser.add_argument("--scope", choices=("all", *SCOPE_ORDER), default="all", help="只看某一类来源")
  parser.add_argument("--list", action="store_true", help="逐条列出未翻译和未收录的条目")
  parser.add_argument("--by-file", action="store_true", help="按主要来源文件统计待翻译数量")
  parser.add_argument("--limit", type=int, default=50, help="--list/--by-file 最多显示多少行，0 表示全部")
  parser.add_argument("--include-stale", action="store_true", help="--list/--json 也输出过时条目")
  parser.add_argument("--json", type=Path, help="把待翻译条目写成 JSON，便于分批翻译")
  parser.add_argument("--strict", action="store_true", help="所选范围内存在未翻译或未收录条目时退出码为 1")
  args = parser.parse_args(argv)

  po_path = TRANSLATIONS_DIR / f"app_{args.lang}.po"
  if not po_path.exists():
    parser.error(f"找不到 {po_path}")
  rows = classify(po_path)
  selected = [row for row in rows if args.scope == "all" or row["scope"] == args.scope]
  todo_status = {"untranslated", "missing"} | ({"stale"} if args.include_stale else set())
  todo = [row for row in selected if row["status"] in todo_status]

  print(f"{po_path.relative_to(ROOT)}（{args.lang}）")
  header = ["范围", "当前文案", "已翻译", "未翻译", "未收录", "同英文", "完成率"]
  sizes = [8, 10, 8, 8, 8, 8, 8]
  print("".join(pad(text, size) for text, size in zip(header, sizes, strict=True)))
  totals = Counter()
  for scope in SCOPE_ORDER:
    if args.scope not in ("all", scope):
      continue
    counts = Counter(row["status"] for row in rows if row["scope"] == scope)
    current = sum(counts[name] for name in ("ok", "same", "untranslated", "missing"))
    done = counts["ok"] + counts["same"]
    totals.update(counts)
    rate = f"{done / current:.1%}" if current else "-"
    values = [scope, current, done, counts["untranslated"], counts["missing"], counts["same"], rate]
    print("".join(pad(str(value), size) for value, size in zip(values, sizes, strict=True)))
  current = sum(totals[name] for name in ("ok", "same", "untranslated", "missing"))
  done = totals["ok"] + totals["same"]
  if args.scope == "all":
    values = ["合计", current, done, totals["untranslated"], totals["missing"], totals["same"], f"{done / current:.1%}" if current else "-"]
    print("".join(pad(str(value), size) for value, size in zip(values, sizes, strict=True)))
  print(f"过时条目（代码中已不存在，不影响显示）：{totals['stale']}")

  if args.by_file:
    counter = Counter(row["refs"][0] if row["refs"] else "(无来源)" for row in todo)
    print("\n按主要来源文件：")
    for path, count in counter.most_common(args.limit or None):
      print(f"  {count:5}  {path}")

  if args.list:
    print("\n待翻译条目：")
    for row in todo[:args.limit or None]:
      print(f"  [{STATUS_LABEL[row['status']]}] {row['msgid']!r}  ← {', '.join(row['refs']) or '(无来源)'}")
    if args.limit and len(todo) > args.limit:
      print(f"  …… 另有 {len(todo) - args.limit} 条，用 --limit 0 显示全部")

  if args.json:
    args.json.write_text(json.dumps(todo, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"\n已写入 {len(todo)} 条到 {args.json}")

  return 1 if args.strict and any(row["status"] in ("untranslated", "missing") for row in selected) else 0


if __name__ == "__main__":
  sys.exit(main())

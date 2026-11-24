"""Translate already formatted display text without changing interpolated values.

The rules are shared with the Galaxy web UI (galaxy/web/js/localization.js translateText); change both together.
"""

import re
from string import Formatter
from typing import NamedTuple

# Joins independent display parts, e.g. "Updating drive history · 3 remaining".
SEPARATOR = re.compile(r'\s+·\s+')
# A fragment that carries its neighbour's separator, e.g. "Date unavailable ·" rendered as its own text.
EDGE_SEPARATOR = re.compile(r'^·\s|\s·\Z')
EDGE_PARTS = re.compile(r'(·\s*)?(.*?)(\s*·)?', re.DOTALL)
FIELD = re.compile(r'\{[^{}]*\}')
CONNECTIVES = frozenset({'to', 'of', 'in', 'on', 'at', 'by', 'for', 'or', 'and', 'a', 'the'})
DIGIT = re.compile(r'[0-9]')
WORD = re.compile(r'[A-Za-z]{2,}')
# What a connective-only template may capture: a number with a short unit ("100 %", "3 km") or a short token.
GENERIC_VALUE = re.compile(r'[0-9.,:+\-−–%°]+(?:\s?\S{1,5})?|\S{0,5}')


class DisplayText(str):
  """A translated or literal display value; never translate it a second time."""
  def format(self, *args, **kwargs):
    return DisplayText(super().format(*args, **kwargs))

  def lower(self):
    return DisplayText(super().lower())

  def upper(self):
    return DisplayText(super().upper())

  def replace(self, old, new, count=-1):
    return DisplayText(super().replace(old, new, count))

  def __getitem__(self, key):
    return DisplayText(super().__getitem__(key))

  def split(self, sep=None, maxsplit=-1):
    return [DisplayText(value) for value in super().split(sep, maxsplit)]


class Template(NamedTuple):
  prefix: str
  pattern: re.Pattern[str]
  keys: list[str]
  target: list[tuple[str, str | None]]
  generic: bool  # Only connectives or one-letter units: "{} to {}", "{}h {}m".
  short: bool  # One content word and at most two words: "Set {}", "{} drive", "Installed: {}.".
  dotted: bool


class DisplayTemplates(dict[str, list[Template]]):
  """Templates grouped by the first character of their prefix, plus the lower-case fallback of the same catalog.

  `lowered` maps a msgid with its literal text lower-cased to the translation, and `lowered_templates` holds the
  templates of those keys. Msgids that are lower-case already are looked up directly and left out, as are lower-case
  keys whose variants translate differently ("Drive Above" / "Drive above").
  """
  def __init__(self):
    super().__init__()
    self.lowered: dict[str, str] = {}
    self.lowered_templates: dict[str, list[Template]] = {}


def parts(text):
  result, auto = [], 0
  for literal, field, _, _ in Formatter().parse(text):
    key = str(auto) if field == '' else field
    result.append((literal, key))
    if field == '':
      auto += 1
  return result


def lower_literals(source):
  """Lower-case the literal text of a msgid, leaving its {fields} untouched."""
  if '{' not in source:
    return source.lower()
  return ''.join(part if index % 2 else part.lower() for index, part in enumerate(re.split(r'(\{[^{}]*\})', source)))


def _template(source, translated):
  try:
    source_parts, target_parts = parts(source), parts(translated)
  except ValueError:
    return None
  keys = [key for _, key in source_parts if key is not None]
  if not keys or sorted(keys) != sorted(key for _, key in target_parts if key is not None):
    return None
  pattern = ''.join(re.escape(literal) + (r'([^\n]*?)' if key is not None else '') for literal, key in source_parts)
  literal_text = ''.join(literal for literal, _ in source_parts)
  content = [word for word in re.findall(r"[a-z]+", literal_text.lower()) if len(word) > 1 and word not in CONNECTIVES]
  # Without a content word the template needs a number ("Smith Farm" is no "{}h {}m"); with only one it would swallow
  # any sentence that starts or ends with that word ("Set speed is a maximum…"). See _fill.
  return Template(source_parts[0][0], re.compile('^' + pattern + '$'), keys, target_parts, not content,
                  len(content) == 1 and len(literal_text.split()) <= 2, '·' in literal_text)


def _by_specificity(item):
  return -len(FIELD.sub('', item[0])), len(FIELD.findall(item[0]))


def display_templates(messages):
  grouped = DisplayTemplates()
  for source, translated in sorted(messages.items(), key=_by_specificity):
    if translated and '{' in source and (template := _template(source, translated)):
      grouped.setdefault(template.prefix[:1], []).append(template)

  # Lower-case text such as "always on lateral" falls back to "Always On Lateral".
  variants = {}
  for source, translated in messages.items():
    if translated and (lowered := lower_literals(source)) != source:
      variants.setdefault(lowered, set()).add(translated)
  grouped.lowered = {lowered: next(iter(translations)) for lowered, translations in variants.items() if len(translations) == 1}
  for source, translated in sorted(grouped.lowered.items(), key=_by_specificity):
    if '{' in source and (template := _template(source, translated)):
      grouped.lowered_templates.setdefault(template.prefix[:1], []).append(template)
  return grouped


def _lookup(text, messages, templates):
  if translated := messages.get(text):
    return translated
  return getattr(templates, 'lowered', {}).get(text) if text == text.lower() else None


def _plain_value(value):
  # A single word such as a device name, or a number with at most two words around it ("25 mph", "3 GiB / 3 GiB").
  return len(value.split()) <= 1 or (DIGIT.search(value) is not None and len(WORD.findall(value)) <= 2)


def _short_value(key, value, messages, templates):
  """What a one-word template ("Set {}", "{} drive") may capture without swallowing a sentence.

  A catalog phrase fits a {label}, which translates it. In an unnamed {} it would stay English next to the translated
  word ("active 车型"), unless it translates to itself ("mph"); a named field such as {name} keeps it as a literal name.
  """
  if (translated := _lookup(value, messages, templates)) and (key == 'label' or translated == value):
    return True
  return not (translated and key.isdigit()) and _plain_value(value)


def _fill(template, text, messages, templates, lowered=False):
  if not text.startswith(template.prefix) or not (matched := template.pattern.fullmatch(text)):
    return None
  values = matched.groups()
  # A connective-only template takes numbers ("0 to 100 %", "In 3 km"), not "…up to 30 seconds…".
  if template.generic and (not any(DIGIT.search(value) for value in values) or
                           not all(GENERIC_VALUE.fullmatch(value.strip()) for value in values)):
    return None
  if template.short and not all(_short_value(key, value.strip(), messages, templates)
                                for key, value in zip(template.keys, values, strict=True)):
    return None
  # Lower-case text has lost the capitals that start a name, so a lower-cased template takes only catalog phrases,
  # numbers and single words: "less than a minute left" is no "{} minute Left".
  if lowered and not all(_lookup(value.strip(), messages, templates) or _plain_value(value.strip()) for value in values):
    return None
  filled = dict(zip(template.keys, values, strict=True))
  if "label" in filled:
    filled["label"] = _lookup(filled["label"], messages, templates) or filled["label"]
  return DisplayText(''.join(literal + (filled[key] if key is not None else '') for literal, key in template.target))


def translate_display(text, messages, templates):
  if isinstance(text, DisplayText):
    return text
  if translated := _lookup(text, messages, templates):
    return DisplayText(translated)
  if len(text) <= 1024:
    # A template without its own "·" must not swallow neighbouring " · " parts; those are translated one by one below.
    separated = SEPARATOR.search(text) is not None
    lowered = getattr(templates, 'lowered_templates', None) if text == text.lower() else None
    for group in (templates, lowered) if lowered else (templates,):
      for template in (*group.get(text[:1], ()), *group.get('', ())):
        if (not separated or template.dotted) and (result := _fill(template, text, messages, templates, group is lowered)) is not None:
          return result
  segments = re.split(rf'(\n|{SEPARATOR.pattern})', text)
  if len(segments) > 1:
    translated = [translate_display(part, messages, templates) if index % 2 == 0 else part for index, part in enumerate(segments)]
    if translated != segments:
      return DisplayText(''.join(translated))
  if EDGE_SEPARATOR.search(text):
    # Try again without the separator at either edge, then put it back.
    before, inner, after = EDGE_PARTS.fullmatch(text).groups()
    if (translated := translate_display(inner, messages, templates)) != inner:
      return DisplayText((before or '') + translated + (after or ''))
  return text


def native_text(text):
  # The web drag-grip icon is absent from the bundled text fonts.
  return DisplayText(text.replace("⠿", "::"))

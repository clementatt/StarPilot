"""Description cards are translated as a whole before they are split into sentences and pages."""

import re
from types import SimpleNamespace

import pytest

from openpilot.selfdrive.ui.mici.widgets import dialog
from openpilot.selfdrive.ui.mici.widgets.button import GreyBigButton
from openpilot.starpilot.ui.raylib import rl
from openpilot.system.ui.lib import wrap_text
from openpilot.system.ui.lib.application import FONT_SCALE, gui_app
from openpilot.system.ui.lib.display_translation import DisplayText, display_templates
from openpilot.system.ui.lib.multilang import multilang
from openpilot.system.ui.widgets import label

ENGLISH = (
  "Enable compensation for road grade? This refreshes during the drive.",
  "Set lane-change following time to 0.8 seconds? Changes refresh during this drive.",
  "Turn off automatic lane changes? New automatic triggers stop after the preference refresh.",
  "A single long sentence that keeps going well past the height of one description card so that it has to be " +
  "split across several cards by measured words rather than by sentence boundaries alone, which is what happens " +
  "for verbose vehicle explanations.",
  "Explicit lines stay authored cards.\nEven when a line is long enough that it has to continue onto the next card " +
  "because the measured text no longer fits inside the card height.\n\nAfter a blank line.",
  "",
)


@pytest.fixture
def cards(monkeypatch):
  def measure(_font, text, size, _spacing=0):
    return rl.Vector2(len(text) * size * .5, size * FONT_SCALE)

  monkeypatch.setattr(gui_app, "font", lambda *_: rl.Font())
  monkeypatch.setattr(gui_app, "texture", lambda _path, width, height: SimpleNamespace(width=width, height=height))
  monkeypatch.setattr(label, "measure_text_cached", measure)
  monkeypatch.setattr(wrap_text, "measure_text_cached", measure)
  monkeypatch.setattr(wrap_text, "_cache", {})

  def build(description: str, messages: dict[str, str] | None = None) -> list[str]:
    messages = messages or {}
    monkeypatch.setattr(multilang, "_translations", messages)
    monkeypatch.setattr(multilang, "_display_templates", display_templates(messages))
    pages = dialog.SettingDescriptionDialog("save change", description)._scroller.items[1:]
    assert all(isinstance(card.value, DisplayText) for card in pages)
    return [card.value for card in pages]
  return build


def previous_cards(description: str) -> list[str]:
  """The card values produced before descriptions were translated as a whole (same measurement)."""
  values = []
  paragraphs = description.splitlines() if "\n" in description else re.split(r"(?<=[.!?])\s+", description.strip())
  for sentence in paragraphs:
    card = GreyBigButton("", "")
    words: list[str] = []
    for word in sentence.split():
      card.set_value(" ".join([*words, word]))
      height = card._sub_label.get_content_height(card._subtitle_width_hint())
      if words and height > card.rect.height - 2 * card.LABEL_VERTICAL_PADDING:
        values.append(" ".join(words))
        card = GreyBigButton("", "")
        words = []
      words.append(word)
    if words:
      values.append(" ".join(words))
  return values


@pytest.mark.parametrize("description", ENGLISH)
def test_english_cards_are_unchanged(cards, description):
  assert cards(description) == previous_cards(description)


def test_long_english_text_is_paged_by_measured_words(cards):
  assert len(cards(ENGLISH[3])) > 1 and len(cards(ENGLISH[4])) > 3


def test_whole_sentence_translation_matches_before_cards_are_split(cards):
  messages = {"Enable compensation for road grade? This refreshes during the drive.": "启用坡度补偿？此设置将在行驶中刷新。",
              "Enable compensation for road grade?": "unused", "This refreshes during the drive.": "unused"}
  assert cards(ENGLISH[0], messages) == ["启用坡度补偿？", "此设置将在行驶中刷新。"]


def test_whole_sentence_templates_match_before_cards_are_split(cards):
  messages = {"Set lane-change following time to {} seconds? Changes refresh during this drive.": "将变道跟车时距设为 {} 秒？更改将在本次行驶中刷新。"}
  assert cards(ENGLISH[1], messages) == ["将变道跟车时距设为 0.8 秒？", "更改将在本次行驶中刷新。"]


def test_unspaced_text_pages_by_character(cards):
  sentence = "松开加速踏板可在巡航未启用且巡航主开关开启时施加制动" * 4 + "。"
  pages = cards("Lift off.", {"Lift off.": sentence})
  assert len(pages) > 1 and "".join(pages) == sentence
  card = GreyBigButton("", "")
  for page in pages:
    card.set_value(page)
    assert card._sub_label.get_content_height(card._subtitle_width_hint()) <= card.rect.height - 2 * card.LABEL_VERTICAL_PADDING


def test_mixed_text_keeps_its_spaces(cards):
  assert cards("Volt.", {"Volt.": "启用 Volt 单踏板驾驶？下次启动后生效。"}) == ["启用 Volt 单踏板驾驶？", "下次启动后生效。"]


def test_sentences_translate_on_their_own_without_a_whole_translation(cards):
  assert cards("First sentence. Second sentence.", {"First sentence.": "第一句。"}) == ["第一句。", "Second sentence."]

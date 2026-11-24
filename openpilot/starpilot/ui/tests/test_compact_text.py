from unittest.mock import patch

from openpilot.starpilot.ui import compact_text, speed_limit_widget
from openpilot.starpilot.ui.settings_state import Destination, destination_label
from openpilot.system.ui.lib.display_translation import DisplayText

CATALOG = {"Lane Change Speed": "变道速度", "Accept": "接受"}


def fake_translation(text):
  return CATALOG.get(text, text)


def test_joined_keeps_value_and_description_separate_and_skips_empty_parts():
  assert compact_text.joined("Auto", "Saved; custom display is off") == "Auto · Saved; custom display is off"
  assert compact_text.joined("On", "") == "On"
  assert compact_text.joined("", "Reason") == "Reason"


def test_step_label_translates_the_label_before_lowercasing_it():
  with patch.object(compact_text, "tr_display", fake_translation):
    label = compact_text.step_label("Lane Change Speed", " +")
    untranslated = compact_text.step_label("Parked Brightness", " -")
  assert label == "变道速度 +" and isinstance(label, DisplayText)
  assert untranslated == "parked brightness -"


def test_slc_button_labels_translate_before_capitalizing():
  with patch.object(speed_limit_widget, "tr_display", fake_translation):
    assert speed_limit_widget.capitals("Accept") == "接受"
    assert speed_limit_widget.capitals("Reject") == "REJECT"


def test_unavailable_notice_names_destinations_by_their_menu_label():
  assert destination_label(Destination.FORCE_DRIVE) == "Force Drive State"
  assert destination_label(Destination.APPEARANCE) == "Visuals"
  assert destination_label(Destination.SOUNDS) == "Sounds & Alerts"
  assert destination_label(Destination.FIREHOSE) == "Firehose"

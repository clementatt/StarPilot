"""Questions and titles are produced as whole sentences, so each one can be translated without splicing in English words."""

from types import SimpleNamespace

import pytest

from opendbc.car.gm.values import CAR
from openpilot.starpilot.ui import lane_change_feature as lane
from openpilot.starpilot.ui.conditional_feature import confirmation_question as conditional_question
from openpilot.starpilot.ui.feature_settings_state import FeatureSettingsRequest
from openpilot.starpilot.ui.panda_wake_feature import LABELS as PANDA_LABELS
from openpilot.starpilot.ui.replay_settings import routes_subtitle, segment_count_text
from openpilot.starpilot.ui.vehicle_bool import VEHICLE_BOOL_KEYS, confirmation_question as vehicle_question
from openpilot.system.ui.lib.display_translation import display_templates, translate_display


@pytest.mark.parametrize("key", sorted(VEHICLE_BOOL_KEYS))
def test_vehicle_questions_are_distinct_whole_sentences(key):
  on, off = (vehicle_question(SimpleNamespace(key=key, value=value, vehicle_fingerprint=CAR.CHEVROLET_VOLT)) for value in ("On", "Off"))
  assert on != off and "{" not in on + off
  if key in PANDA_LABELS:
    # The row title keeps its case, so the {label} template can look up its translation.
    assert PANDA_LABELS[key][0] in on and PANDA_LABELS[key][0] in off


def test_gm_auto_hold_names_the_release_control_in_the_sentence():
  lacrosse = vehicle_question(SimpleNamespace(key="GMAutoHold", value="On", vehicle_fingerprint=CAR.BUICK_LACROSSE))
  volt = vehicle_question(SimpleNamespace(key="GMAutoHold", value="On", vehicle_fingerprint=CAR.CHEVROLET_VOLT))
  assert lacrosse.endswith("Press the gas to release a hold.") and volt.endswith("Press the gas or regen paddle to release a hold.")


def test_lane_change_switches_are_whole_sentences_and_numbers_keep_only_the_value():
  assert all((key, value) in lane.SWITCH_QUESTIONS for key in (lane.GUIDANCE, lane.ENABLED, lane.ONE, lane.AUTO, lane.REQUIRE_CRUISE, lane.CLOSE)
             for value in ("On", "Off"))
  speed = lane.confirm_question(FeatureSettingsRequest(lane.SPEED, None, "25", display_unit="km/h"))
  assert speed == "Set minimum lane-change speed to 25 km/h? Changes apply after the current signal and maneuver end."
  messages = {source: "<" + source + ">" for source in lane.NUMBER_QUESTIONS.values()}
  assert translate_display(speed, messages, display_templates(messages)) == "<Set minimum lane-change speed to 25 km/h? " + \
    "Changes apply after the current signal and maneuver end.>"


def test_conditional_questions_keep_the_row_label_for_lookup():
  ask = lambda key, value, label="", unit="": conditional_question(FeatureSettingsRequest(key, None, value), label, unit)  # noqa: E731
  assert ask("conditional:mode", "Chill", "Driving Mode") == "Set driving mode to Chill?"
  assert ask("conditional:cem:curves", "On", "Curves") == "Set Curves to On?"
  assert ask("conditional:cem:speed_mps", "25", "Speed threshold", "mph") == "Set Speed threshold to 25 mph?"
  messages = {"Set {label} to {value}?": "{label} = {value}?", "Speed threshold": "Umbral"}
  assert translate_display("Set Speed threshold to 25 mph?", messages, display_templates(messages)) == "Umbral = 25 mph?"


def test_replay_counts_are_whole_singular_and_plural_phrases():
  assert [segment_count_text(n) for n in (0, 1, 2)] == ["0 segments", "1 segment", "2 segments"]
  assert [routes_subtitle(n) for n in (1, 3)] == ["1 recorded route - Newest first", "3 recorded routes - Newest first"]

"""Compact (C4) card text built from a saved row's label or value and its description."""

from openpilot.system.ui.lib.display_translation import DisplayText
from openpilot.system.ui.lib.multilang import tr_display

# Joins a row's value and description so each part is translated on its own, e.g. "auto · saved; custom display is off".
PART_SEPARATOR = " · "


def joined(*parts: str) -> str:
  """The non-empty parts of a card subtitle, separated so each one translates independently."""
  return PART_SEPARATOR.join(part for part in parts if part)


def step_label(label: str, symbol: str) -> DisplayText:
  """A step button's title, e.g. "parked brightness +": translate the label before lower-casing it, then add the symbol."""
  return DisplayText(DisplayText(tr_display(label)).lower() + symbol)

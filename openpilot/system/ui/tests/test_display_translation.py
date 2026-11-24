from openpilot.system.ui.lib.display_translation import DisplayText, display_templates, translate_display


def test_translated_text_is_not_translated_twice_after_formatting_or_elision():
  messages = {'Network': 'Red', 'Red': 'Rojo'}
  result = translate_display('Network', messages, {})
  assert isinstance(result, DisplayText) and result == 'Red'
  assert translate_display(result, messages, {}) == 'Red'
  assert translate_display(result.format(), messages, {}) == 'Red'
  assert isinstance(result[:], DisplayText)
  assert isinstance(result.lower(), DisplayText)
  assert all(isinstance(part, DisplayText) for part in result.split())


def test_formatted_display_templates_preserve_values_and_named_reordering():
  messages = {'{} drives': '{} trayectos', 'Saved {count} items for {name}': 'Para {name}: {count} elementos guardados',
              'Preparing {} ({}%)': 'Preparando {} ({}%)'}
  templates = display_templates(messages)
  assert translate_display('3 drives', messages, templates) == '3 trayectos'
  assert translate_display('Saved 12 items for Dom', messages, templates) == 'Para Dom: 12 elementos guardados'
  assert translate_display('Preparing Alpha (23%)', messages, templates) == 'Preparando Alpha (23%)'
  assert translate_display('SpeedLimitController', messages, templates) == 'SpeedLimitController'
  assert translate_display('unknown', messages, templates) == 'unknown'


def test_optional_plural_suffix_and_specific_template_take_priority():
  messages = {'{} day': '{}일', 'Expires in {} day{}': '{}일{} 후 만료', '{} minute{} Left': '{}분{} 남음',
              'Expires in {} day': '{}일 후 만료', 'Expires in {} days': '{}일 후 만료'}
  templates = display_templates(messages)
  assert translate_display('Expires in 1 day', messages, templates) == '1일 후 만료'
  assert translate_display('Expires in 3 days', messages, templates) == '3일 후 만료'
  assert translate_display('1 minute Left', messages, templates) == '1분 남음'


def test_common_label_boundary_preserves_translated_or_literal_marker(monkeypatch):
  from openpilot.system.ui.widgets.label import UnifiedLabel
  from openpilot.system.ui.lib.multilang import multilang
  monkeypatch.setattr(multilang, '_translations', {'Default': 'Standard', 'Standard': 'Standardmodus'})
  translated = DisplayText('Standard')
  label = object.__new__(UnifiedLabel)
  label._text = lambda: translated
  assert label.text == 'Standard' and isinstance(label.text, DisplayText)
  label._text = DisplayText('Default')  # A literal SSID named Default must not be localized.
  assert label.text == 'Default'


def test_retained_lazy_label_follows_language_changes(monkeypatch):
  from openpilot.system.ui.widgets.label import UnifiedLabel
  from openpilot.system.ui.lib.multilang import multilang
  label = object.__new__(UnifiedLabel)
  label._text = lambda: multilang.tr('Advanced')
  monkeypatch.setattr(multilang, '_translations', {'Advanced': 'Erweitert'})
  assert label.text == 'Erweitert'
  monkeypatch.setattr(multilang, '_translations', {'Advanced': '고급'})
  assert label.text == '고급'


def test_ui_label_placeholders_localize_but_user_names_stay_literal():
  messages = {'Language': 'Sprache', 'Home': 'Startseite', 'Reset {label} to default': '{label} zurücksetzen',
              'Saved for {name}': 'Gespeichert für {name}'}
  templates = display_templates(messages)
  assert translate_display('Reset Language to default', messages, templates) == 'Sprache zurücksetzen'
  assert translate_display('Saved for Home', messages, templates) == 'Gespeichert für Home'


def test_separated_parts_translate_one_by_one_unless_the_template_has_its_own_separator():
  messages = {'{} remaining': 'Quedan {}', 'Updating drive history': 'Actualizando el historial',
              '{} AOL steering only · {}/{} drives measured': '{} solo dirección AOL · {}/{} trayectos medidos',
              '{} AOL steering only': '{} solo AOL'}
  templates = display_templates(messages)
  assert translate_display('Updating drive history · 3 remaining', messages, templates) == 'Actualizando el historial · Quedan 3'
  assert translate_display('3 remaining', messages, templates) == 'Quedan 3'
  assert translate_display('12% AOL steering only · 3/5 drives measured', messages, templates) == \
    '12% solo dirección AOL · 3/5 trayectos medidos'
  # A middle dot without surrounding spaces is part of the value, not a separator.
  assert translate_display('A·B remaining', messages, templates) == 'Quedan A·B'


def test_templates_of_only_one_letter_units_need_a_number():
  messages = {'{}h {}m': '{} 小时 {} 分', '{} to {}': '{} 至 {}'}
  templates = display_templates(messages)
  assert translate_display('1h 05m', messages, templates) == '1 小时 05 分'
  assert translate_display('Smith Farm', messages, templates) == 'Smith Farm'
  assert translate_display('Search by platform', messages, templates) == 'Search by platform'
  assert translate_display('Set to zero', messages, templates) == 'Set to zero'
  assert translate_display('5 to 10', messages, templates) == '5 至 10'


def test_lower_case_text_falls_back_to_the_catalog_without_case():
  messages = {'Always On Lateral': '全时横向控制', 'Reset {label} to default': '将 {label} 重置为默认', 'On': '开',
              'Keep steering active': '保持转向', 'Active': '当前', 'active': '活动', 'Set {label} to {value}?': '将“{label}”设为 {value}？'}
  templates = display_templates(messages)
  result = translate_display('always on lateral', messages, templates)
  assert isinstance(result, DisplayText) and result == '全时横向控制'
  assert translate_display('reset always on lateral to default', messages, templates) == '将 全时横向控制 重置为默认'
  assert translate_display('set always on lateral to 2.5 s?', messages, templates) == '将“全时横向控制”设为 2.5 s？'
  assert translate_display('on · keep steering active', messages, templates) == '开 · 保持转向'
  assert translate_display('active', messages, templates) == '活动', "an exact lower-case msgid still wins"
  assert translate_display('Always on lateral', messages, templates) == 'Always on lateral', "only text without capitals falls back"
  assert translate_display('always on lateral', messages, {}) == 'always on lateral', "the index is built by display_templates"
  english = display_templates({})
  assert translate_display('always on lateral', {}, english) == 'always on lateral'
  assert translate_display('Reset Always On Lateral to default', {}, english) == 'Reset Always On Lateral to default'


def test_case_insensitive_fallback_skips_variants_that_translate_differently():
  messages = {'Drive Above': '请提高车速', 'Drive above': '车速需高于', 'OFF': '关闭', 'Off': '关闭',
              'Recent {} Drives': '最近 {} 次行程', 'Recent {} drives': '近期 {} 次行程'}
  templates = display_templates(messages)
  assert translate_display('drive above', messages, templates) == 'drive above'
  assert translate_display('Drive Above', messages, templates) == '请提高车速'
  assert translate_display('off', messages, templates) == '关闭', "variants that agree are not ambiguous"
  assert translate_display('recent 3 drives', messages, templates) == 'recent 3 drives'


def test_lower_cased_templates_take_only_catalog_phrases_numbers_or_single_words():
  messages = {'{} minute Left': '剩余 {} 分钟', 'Delete {} from Favorites?': '从收藏中删除 {}？', 'Lane Changes': '变道'}
  templates = display_templates(messages)
  assert translate_display('3 minute left', messages, templates) == '剩余 3 分钟'
  assert translate_display('less than a minute left', messages, templates) == 'less than a minute left'
  assert translate_display('delete cheddar from favorites?', messages, templates) == '从收藏中删除 cheddar？'
  assert translate_display('delete lane changes from favorites?', messages, templates) == '从收藏中删除 lane changes？'
  assert translate_display('delete my old model from favorites?', messages, templates) == 'delete my old model from favorites?'


def test_connective_templates_capture_only_numbers_or_short_tokens():
  messages = {'{} to {}': '{} 至 {}', '{} to {} {}': '{} 至 {} {}', 'In {}': '{} 后'}
  templates = display_templates(messages)
  assert translate_display('0 to 100 %', messages, templates) == '0 至 100 %'
  assert translate_display('5 to 10', messages, templates) == '5 至 10'
  assert translate_display('In 3 km', messages, templates) == '3 km 后'
  for text in ('3. You must be ready to take over at any time.', 'Joining pauses the Galaxy hotspot for up to 30 seconds.',
               'Connect to Pixel 8', 'Receive alerts to steer back into the lane within 2 seconds'):
    assert translate_display(text, messages, templates) == text


def test_one_word_templates_do_not_swallow_sentences():
  messages = {'Set {}': '设置 {}', '{} drive': '{} 次行程', '{} models': '{} 车型', 'active': '活动', 'Open {}': '打开 {}',
              'Saved {}': '已保存 {}', '{} seconds': '{} 秒', '{} {} and above': '{} {} 及以上', 'mph': 'mph',
              'Checked {label}': '已检查 {label}', 'Today': '今天', 'Default: {label}': '默认：{label}'}
  templates = display_templates(messages)
  for text in ('Set speed is a maximum, not a target.', 'Model selected for the next drive', 'active models',
               'Open the StarPilot app and connect to your comma.', 'Saved for this browser.',
               'For prompts, + accepts and − declines within 30 seconds', 'Default: daily at local midnight. Uses the timezone.'):
    assert translate_display(text, messages, templates) == text
  assert translate_display('Set 25 mph', messages, templates) == '设置 25 mph'
  assert translate_display('1 drive', messages, templates) == '1 次行程'
  assert translate_display('5 models', messages, templates) == '5 车型'
  assert translate_display('Open Networks', messages, templates) == '打开 Networks', "a single word is a name"
  assert translate_display('Saved 3 items', messages, templates) == '已保存 3 items'
  assert translate_display('99 mph and above', messages, templates) == '99 mph 及以上', "mph translates to itself"
  assert translate_display('Checked Today', messages, templates) == '已检查 今天', "a {label} translates its catalog phrase"
  assert translate_display('Default: 5', messages, templates) == '默认：5'


def test_separator_at_an_edge_is_kept_around_the_translated_fragment():
  messages = {'Date unavailable': '日期不可用', 'Waiting for data': '等待数据', '· Downloaded {label}': '· 已下载 {label}',
              'Today': '今天', 'Cancel': '取消'}
  templates = display_templates(messages)
  assert translate_display('Date unavailable ·', messages, templates) == '日期不可用 ·'
  assert translate_display('· Waiting for data', messages, templates) == '· 等待数据'
  assert translate_display('· Cancel ·', messages, templates) == '· 取消 ·'
  assert translate_display('· Downloaded Today', messages, templates) == '· 已下载 今天', "a template with its own · comes first"
  assert translate_display('Unknown ·', messages, templates) == 'Unknown ·'
  assert translate_display('A·B', messages, templates) == 'A·B'

"""Confirmation text for parked vehicle preferences."""

VEHICLE_BOOL_KEYS = frozenset(("AlphaLongitudinalEnabled", "SubaruAvhStartup", "SubaruStopStartOff", "SubaruSNG", "SubaruRedneckCruise", "RedneckCruise",
                              "GMPedalLongitudinal", "DisableOpenpilotLongitudinal", "LongPitch", "VoltSNG", "SNGHack", "GMAutoHold", "VoltOnePedalMode",
                              "TeslaCoopSteering", "TeslaAOLDisengageOnBrake", "TeslaSpeedSync",
                              "RemoteStartBootsComma", "HKGRemoteStartBootsComma", "IgnoreIgnitionLine", "TeslaWakeOnCAN"))

# (question for On, question for Off). Each is a whole sentence so it can be translated without splicing in a verb.
QUESTIONS = {
  "AlphaLongitudinalEnabled": (
    ("Enable Alpha Longitudinal after the next startup? StarPilot will request speed control instead of factory ACC. " +
     "Automatic Emergency Braking may be disabled; exact startup checks still apply."),
    ("Disable Alpha Longitudinal after the next startup? StarPilot will request speed control instead of factory ACC. " +
     "Automatic Emergency Braking may be disabled; exact startup checks still apply.")),
  "GMPedalLongitudinal": (
    "Enable Pedal Speed Control after the next startup? A compatible connected interceptor must be detected before StarPilot can control it.",
    "Disable Pedal Speed Control after the next startup? A compatible connected interceptor must be detected before StarPilot can control it."),
  "DisableOpenpilotLongitudinal": (
    "Turn off StarPilot speed control after the next startup? Steering stays unchanged.",
    "Turn on StarPilot speed control after the next startup? Steering stays unchanged."),
  "SubaruAvhStartup": (
    "Enable AVH ON at the next startup? A bounded request runs once in Park with the engine running.",
    "Disable AVH ON at the next startup? A bounded request runs once in Park with the engine running."),
  "SubaruStopStartOff": (
    "Enable Stop/Start OFF at the next startup? A bounded request runs once while stationary in Park or Neutral.",
    "Disable Stop/Start OFF at the next startup? A bounded request runs once while stationary in Park or Neutral."),
  "SubaruSNG": (
    "Enable Subaru stop-and-go assistance after the next startup? Factory ACC retains speed control.",
    "Disable Subaru stop-and-go assistance after the next startup? Factory ACC retains speed control."),
  "RedneckCruise": (
    "Enable Redneck Cruise after the next startup? Factory cruise keeps control of the pedals.",
    "Disable Redneck Cruise after the next startup? Factory cruise keeps control of the pedals."),
  "SubaruRedneckCruise": (
    "Enable software cruise after the next startup? Stock ACC keeps pedal control.",
    "Disable software cruise after the next startup? Stock ACC keeps pedal control."),
  "SNGHack": (
    "Enable Toyota stop-and-go assistance after the next startup?",
    "Disable Toyota stop-and-go assistance after the next startup?"),
  "VoltSNG": (
    "Enable Volt stop-and-go assistance after the next startup?",
    "Disable Volt stop-and-go assistance after the next startup?"),
  "VoltOnePedalMode": (
    "Enable Volt one-pedal driving after the next startup? Lifting off the accelerator can apply the brakes with cruise disengaged and cruise main on.",
    "Disable Volt one-pedal driving after the next startup? Lifting off the accelerator can apply the brakes with cruise disengaged and cruise main on."),
  "LongPitch": (
    "Enable compensation for road grade? This refreshes during the drive.",
    "Disable compensation for road grade? This refreshes during the drive."),
  "TeslaCoopSteering": (
    "Enable Tesla cooperative steering after the next startup? Light steering input adjusts the assisted steering angle within its limits.",
    "Disable Tesla cooperative steering after the next startup? Light steering input adjusts the assisted steering angle within its limits."),
  "TeslaAOLDisengageOnBrake": (
    "Enable disarming Always On Lateral with the brake after the next startup? This applies with either Tesla harness.",
    "Disable disarming Always On Lateral with the brake after the next startup? This applies with either Tesla harness."),
  "TeslaSpeedSync": (
    "Enable Comma can set speed on Tesla dashboard? While it is on, StarPilot keeps its own set speed and scrolls the Tesla's set speed to match it.",
    "Disable Comma can set speed on Tesla dashboard? While it is on, StarPilot keeps its own set speed and scrolls the Tesla's set speed to match it."),
}
# Keyed by whether the car releases a hold with the gas only (Buick LaCrosse) or also with the regen paddle.
GM_AUTO_HOLD_QUESTIONS = {
  True: ("Enable Automatic Brake Hold after the next startup? Press the gas to release a hold.",
         "Disable Automatic Brake Hold after the next startup? Press the gas to release a hold."),
  False: ("Enable Automatic Brake Hold after the next startup? Press the gas or regen paddle to release a hold.",
          "Disable Automatic Brake Hold after the next startup? Press the gas or regen paddle to release a hold."),
}


def confirmation_question(request):
  if request.value not in ("On", "Off"):
    raise ValueError("Unsupported vehicle preference value")
  turning_on = request.value == "On"
  from openpilot.starpilot.ui.panda_wake_feature import LABELS
  if request.key in LABELS:
    # The label keeps its own case so it is translated like the row title.
    label = LABELS[request.key][0]
    return (f"Enable {label}? This changes Panda firmware after the next device restart." if turning_on else
            f"Disable {label}? This changes Panda firmware after the next device restart.")
  if request.key == "GMAutoHold":
    from opendbc.car.gm.values import CAR
    questions = GM_AUTO_HOLD_QUESTIONS[request.vehicle_fingerprint == CAR.BUICK_LACROSSE]
  elif request.key in QUESTIONS:
    questions = QUESTIONS[request.key]
  else:
    raise ValueError("Unsupported vehicle preference")
  return questions[0] if turning_on else questions[1]

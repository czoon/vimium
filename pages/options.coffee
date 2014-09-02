$ = (id) -> document.getElementById id

bgSettings = chrome.extension.getBackgroundPage().Settings

editableFields = [ "scrollStepSize", "linkHintCharacters", "linkHintNumbers",
  "userDefinedLinkHintCss", "keyMappings", "filterLinkHints", "previousPatterns",
  "nextPatterns", "hideHud", "regexFindMode", "searchUrl", "searchEngines"]

canBeEmptyFields = ["keyMappings", "userDefinedLinkHintCss", "searchEngines"]

# Settings which handle their own DOM and callbacks for the options page.
# See populateOption in ../background_scripts/exclusions.coffee for an example.
selfHandlingFields =
  exclusionRules: (args...) -> chrome.extension.getBackgroundPage().Exclusions.populateOption(args...)
selfHandlingCallbacks = {}

document.addEventListener "DOMContentLoaded", ->
  populateOptions()

  for field in editableFields
    $(field).addEventListener "keyup", onOptionKeyup, false
    $(field).addEventListener "change", enableSaveButton, false
    $(field).addEventListener "change", onDataLoaded, false

  $("advancedOptionsLink").addEventListener "click", toggleAdvancedOptions, false
  $("showCommands").addEventListener "click", (->
    showHelpDialog chrome.extension.getBackgroundPage().helpDialogHtml(true, true, "Command Listing"), frameId
  ), false
  document.getElementById("restoreSettings").addEventListener "click", restoreToDefaults
  document.getElementById("saveOptions").addEventListener "click", saveOptions

window.onbeforeunload = -> "You have unsaved changes to options." unless $("saveOptions").disabled

onOptionKeyup = (event) ->
  if (event.target.getAttribute("type") isnt "checkbox" and
      event.target.getAttribute("savedValue") isnt event.target.value)
    enableSaveButton()

onDataLoaded = ->
  hide = (el) -> el.parentNode.parentNode.style.display = "none"
  show = (el) -> el.parentNode.parentNode.style.display = "table-row"
  if $("filterLinkHints").checked
    hide $("linkHintCharacters")
    show $("linkHintNumbers")
  else
    show $("linkHintCharacters")
    hide $("linkHintNumbers")

enableSaveButton = ->
  $("saveOptions").removeAttribute "disabled"

# Saves options to localStorage.
saveOptions = ->

  # If the value is unchanged from the default, delete the preference from localStorage; this gives us
  # the freedom to change the defaults in the future.
  for fieldName in editableFields
    field = $(fieldName)
    switch field.getAttribute("type")
      when "checkbox"
        fieldValue = field.checked
      when "number"
        fieldValue = parseFloat field.value
      else
        fieldValue = field.value.trim()
        field.value = fieldValue

    # If it's empty and not a field that we allow to be empty, restore to the default value
    if not fieldValue and canBeEmptyFields.indexOf(fieldName) is -1
      bgSettings.clear fieldName
      fieldValue = bgSettings.get(fieldName)
    else
      bgSettings.set fieldName, fieldValue
    $(fieldName).value = fieldValue
    $(fieldName).setAttribute "savedValue", fieldValue
    bgSettings.performPostUpdateHook fieldName, fieldValue
 
  # Self-handling options save themselves.
  for field of selfHandlingFields
    selfHandlingCallbacks[field].saveOption() if selfHandlingCallbacks[field].saveOption

  $("saveOptions").disabled = true

# Restores select box state to saved value from localStorage.
populateOptions = ->
  for field in editableFields
    val = bgSettings.get(field) or ""
    setFieldValue $(field), val
  # Self-handling options build their own DOM, and provide callbacks for saveOptions and restoreToDefaults.
  for field of selfHandlingFields
    selfHandlingCallbacks[field] = selfHandlingFields[field]($(field),enableSaveButton)
  onDataLoaded()

restoreToDefaults = ->
  return unless confirm "Are you sure you want to return Vimium's settings to their defaults?"

  for field in editableFields
    val = bgSettings.defaults[field] or ""
    setFieldValue $(field), val
  # Self-handling options restore their own defaults.
  for field of selfHandlingFields
    selfHandlingCallbacks[field].restoreToDefault() if selfHandlingCallbacks[field].restoreToDefault
  onDataLoaded()
  enableSaveButton()

setFieldValue = (field, value) ->
  unless field.getAttribute("type") is "checkbox"
    field.value = value
    field.setAttribute "savedValue", value
  else
    field.checked = value

toggleAdvancedOptions = do (advancedMode=false) -> (event) ->
  if advancedMode
    $("advancedOptions").style.display = "none"
    $("advancedOptionsLink").innerHTML = "Show advanced options&hellip;"
  else
    $("advancedOptions").style.display = "table-row-group"
    $("advancedOptionsLink").innerHTML = "Hide advanced options"
  advancedMode = !advancedMode
  event.preventDefault()

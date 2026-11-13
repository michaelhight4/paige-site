-- kil_fx_build.lua : build transparent, effect-sized Kilumen battle FX in Gary's Aseprite (batch mode).
-- Written Oct 22, 2026 (CT). Uses only the documented Aseprite Lua API (aseprite.org/api).
-- For every job in <base>\jobs.lua: new RGB sprite (Kilumen 64 palette), one layer "fx",
-- frames from the effect-only 1x PNGs, per-frame ms, one tag, an "impact_centre"/"path_start"/"path_end"
-- slice, saved as .aseprite; then a 2x nearest-neighbour duplicate exports the GIF and a horizontal
-- PNG sheet + Aseprite JSON. Writes only under <base>\out\. Prints one JSON line per job + a summary.
-- Run: Aseprite.exe -b --script-param base=<run dir> --script-param palette=<kilumen_64.hex> --script kil_fx_build.lua
local P = app.params
local BASE = P.base
local PALF = P.palette
local function q(s) return '"' .. tostring(s):gsub('\\', '\\\\'):gsub('"', '\\"') .. '"' end
local REPORT = BASE and (BASE .. "\\out\\kil_fx_report.jsonl") or nil
local function emit(line)
  print(line)
  if REPORT then local f = io.open(REPORT, "a"); if f then f:write(line .. "\n"); f:close() end end
end
if not BASE or not app.fs.isDirectory(BASE) then print('{"ok":false,"cmd":"kil_fx_build","error":"base= missing or not a folder"}'); return 1 end
app.fs.makeAllDirectories(BASE .. "\\out")

-- palette
local cols = {}
local fh = io.open(PALF or "", "rb")
if not fh then emit('{"ok":false,"cmd":"kil_fx_build","error":' .. q("cannot read palette " .. tostring(PALF)) .. '}'); return 1 end
for line in fh:read("a"):gmatch("[^\r\n]+") do
  local h = line:match("^%s*#?(%x%x%x%x%x%x)%s*$")
  if h then cols[#cols + 1] = { tonumber(h:sub(1, 2), 16), tonumber(h:sub(3, 4), 16), tonumber(h:sub(5, 6), 16) } end
end
fh:close()
if #cols ~= 64 then emit('{"ok":false,"cmd":"kil_fx_build","error":"palette is not 64 colours"}'); return 1 end
local function make_pal()
  local pal = Palette(#cols)
  for i, c in ipairs(cols) do pal:setColor(i - 1, Color{ r = c[1], g = c[2], b = c[3], a = 255 }) end
  return pal
end

local jobs = dofile(BASE .. "\\jobs.lua")
local passed, failed, failed_jobs = 0, 0, {}
for _, j in ipairs(jobs) do
  local opened = {}
  local ok, err = pcall(function()
    local od = BASE .. "\\out\\" .. j.dir
    app.fs.makeAllDirectories(od)
    local spr = Sprite(j.w, j.h, ColorMode.RGB); opened[#opened + 1] = spr
    spr:setPalette(make_pal())
    local layer = spr.layers[1]; layer.name = "fx"
    for i = 2, #j.frames do spr:newEmptyFrame() end
    for i, f in ipairs(j.frames) do
      local img = Image{ fromFile = BASE .. "\\" .. f }
      if img == nil then error("could not load " .. f) end
      if img.width ~= j.w or img.height ~= j.h then error("frame size mismatch " .. f) end
      spr:newCel(layer, spr.frames[i], img, Point(0, 0))
      spr.frames[i].duration = j.ms[i] / 1000
    end
    local tag = spr:newTag(1, #spr.frames); tag.name = j.tag
    for _, a in ipairs(j.slices or {}) do
      local s = spr:newSlice(Rectangle(a[2], a[3], 1, 1)); s.name = a[1]
    end
    spr:saveAs(od .. "\\" .. j.base .. ".aseprite")
    local big = Sprite(spr); opened[#opened + 1] = big
    if app.sprite == nil or app.sprite.id ~= big.id then error("2x duplicate is not the active sprite") end
    app.command.SpriteSize{ ui = false, scale = 2, method = "nearest" }
    if big.width ~= j.w * 2 or big.height ~= j.h * 2 then error("SpriteSize did not scale 2x") end
    big:saveCopyAs(od .. "\\" .. j.base .. "_battle_2x.gif")
    app.command.ExportSpriteSheet{
      ui = false, askOverwrite = false, recent = false, openGenerated = false,
      type = SpriteSheetType.HORIZONTAL, columns = 0, rows = 0, width = 0, height = 0, bestFit = false,
      textureFilename = od .. "\\" .. j.base .. "_battle_2x_sheet.png",
      dataFilename = od .. "\\" .. j.base .. "_battle_2x_sheet_aseprite.json",
      dataFormat = SpriteSheetDataFormat.JSON_ARRAY, filenameFormat = j.base .. "_{frame}",
      borderPadding = 0, shapePadding = 0, innerPadding = 0, trimSprite = false, trim = false, trimByGrid = false,
      extrude = false, ignoreEmpty = false, mergeDuplicates = false, layer = "", tag = "",
      splitLayers = false, splitTags = false, splitGrid = false, listLayers = true, listTags = true, listSlices = true,
      fromTilesets = false,
    }
    for _, ext in ipairs({ ".aseprite", "_battle_2x.gif", "_battle_2x_sheet.png", "_battle_2x_sheet_aseprite.json" }) do
      if not app.fs.isFile(od .. "\\" .. j.base .. ext) then error("missing output " .. j.base .. ext) end
    end
  end)
  for k = #opened, 1, -1 do pcall(function() opened[k]:close() end) end
  if ok then passed = passed + 1; emit('{"ok":true,"cmd":"kil_fx_build","job":' .. q(j.base) .. ',"frames":' .. #j.frames .. ',"w2x":' .. j.w * 2 .. ',"h2x":' .. j.h * 2 .. '}')
  else failed = failed + 1; failed_jobs[#failed_jobs + 1] = q(j.base); emit('{"ok":false,"cmd":"kil_fx_build","job":' .. q(j.base) .. ',"error":' .. q(err) .. '}') end
end
emit('{"ok":' .. tostring(failed == 0) .. ',"cmd":"kil_fx_build","summary":true,"passed":' .. passed .. ',"failed":' .. failed ..
     ',"failed_jobs":[' .. table.concat(failed_jobs, ",") .. '],"aseprite":' .. q(tostring(app.version)) .. '}')
if failed > 0 then return 1 end
return 0

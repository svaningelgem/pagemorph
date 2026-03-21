@echo off
del /q pagemorph.xpi 2>nul
zip -r pagemorph.xpi manifest.json content.js popup\ options\ icons\icon-48.png icons\icon-96.png
echo Built pagemorph.xpi

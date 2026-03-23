$Host.UI.RawUI.WindowTitle = "HEAVEN CONTROL PANEL"
Set-Location $PSScriptRoot
$env:PREFIX = "+"
.\heaven-bot.exe
Read-Host "Press Enter to exit"

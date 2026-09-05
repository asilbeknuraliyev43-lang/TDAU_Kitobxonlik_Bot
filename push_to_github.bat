@echo off
chcp 65001 > nul
echo ===================================================
echo  TDAU KITOBXONLIK AKADEMIYASI - GITHUB REPO YARATISH
echo ===================================================
echo.

echo 1. GitHub tizimiga kirish (Login)...
"C:\Program Files\GitHub CLI\gh.exe" auth login

echo.
echo 2. Yangi repozitoriya yaratish va barcha kodlarni yuklash...
"C:\Program Files\GitHub CLI\gh.exe" repo create TDAU_Kitobxonlik_Bot --public --source=. --remote=origin --push

echo.
echo ===================================================
echo  Tabriklaymiz! Loyiha GitHub profilingizga yuklandi!
echo ===================================================
pause

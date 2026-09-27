@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ============================================
echo   Jin Kang 个人主页 — 推送到 GitHub
echo ============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Git。请先安装：https://git-scm.com/download/win
  pause
  exit /b 1
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo [错误] 没有 origin。请先执行：
  echo        git remote add origin https://github.com/jinkang03/kang.git
  pause
  exit /b 1
)

echo 正在提交改动 ...
git add -A
git diff --cached --quiet
if errorlevel 1 goto docommit
echo [信息] 没有新的改动，直接推送。
goto dopush

:docommit
git commit -m "deploy: update personal site"
if errorlevel 1 goto commitfail

:dopush
echo 正在推送到 GitHub ...
git push -u origin main
if errorlevel 1 goto pushfail

echo.
echo [成功] 已推送。GitHub Actions 会自动发布。
echo 大约一分钟后打开：
echo https://jinkang03.github.io/kang/
echo.
pause
exit /b 0

:commitfail
echo [错误] 提交失败。如果提示身份未设置，请先运行：
echo        git config user.name "你的名字"
echo        git config user.email "你的邮箱"
pause
exit /b 1

:pushfail
echo [失败] 推送失败。请确认这台电脑已登录 GitHub，并且能写入 jinkang03/kang。
pause
exit /b 1
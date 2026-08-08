@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ==============================================
echo   Ethan Kang - 个人主页 · 一键部署到 GitHub
echo ==============================================
echo.

where git >nul 2>nul || (
  echo [错误] 未安装 Git，请先安装：https://git-scm.com/download/win
  echo 安装后请重新运行本脚本。
  pause
  exit /b 1
)

git remote -v >nul 2>&1
if %errorlevel% neq 0 goto noRemote

echo [提示] 已检测到远程仓库，准备直接推送最新修改。
goto doPush

:noRemote
echo.
echo 首次使用请按提示操作：
echo -----------------------------------------------
echo.
echo 1/ 打开 https://github.com/new  创建新仓库
echo    · Repository name 建议填：ethan-kang
echo    · 不要勾选 "Add a README file"
echo    · 点击 Create repository
echo.
echo 2/ 创建完成后，在 "Quick setup" 下方点击 "SSH" 或 "HTTPS"
echo    复制以 "git@github.com:" 或 "https://github.com/" 开头的仓库地址
echo.
set /p REPO=3/ 粘贴你的仓库地址后按回车：

if "%REPO%"=="" (
  echo [错误] 仓库地址不能为空
  pause
  exit /b 1
)

git remote add origin "%REPO%"
echo.
echo [OK] 远程仓库已添加：%REPO%

:doPush
echo.
echo ========== 正在部署 (git push origin main) ==========
git push -u origin main

if %errorlevel% neq 0 (
  echo.
  echo [失败] push 失败！请检查：
  echo   1) 是否已在本机登录 GitHub（git credential）
  echo   2) 仓库地址是否正确，且你有 push 权限
  echo   3) 如使用 HTTPS，现在 GitHub 需要 Personal Access Token 作为密码
  echo      生成地址：https://github.com/settings/tokens  (勾选 repo 权限)
  echo.
  echo 可随时重新双击 deploy.bat 重试。
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  [成功] 代码已推送！
echo ------------------------------------------------------------
echo  下一步（只需做一次）：
echo   1. 打开你的 GitHub 仓库页面：点击 Settings
echo   2. 左侧菜单找到 Pages
echo   3. Source 选择 "Deploy from a branch"
echo      Branch 选 main  /  (root)
echo   4. 点击 Save，等 1-2 分钟。
echo.
echo  完成后公网访问地址：
echo    https://^<你的 GitHub 用户名^>.github.io/^<仓库名^>/
echo    例：https://jinkangdeng.github.io/ethan-kang/
echo ============================================================
pause

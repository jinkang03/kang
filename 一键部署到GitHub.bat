@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   Ethan Kang - 个人主页 · 一键部署到 GitHub
echo ============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Git，请先安装：
  echo        https://git-scm.com/download/win
  echo 安装完成后重新双击本脚本即可。
  echo.
  pause
  exit /b 1
)

REM 检查 origin 远程是否已配置
git remote get-url origin >nul 2>nul
if errorlevel 1 goto setup

echo [信息] 已配置远程仓库。
echo.
goto commit

:setup
echo.
echo 首次部署，请按以下步骤操作：
echo --------------------------------------------
echo  1. 浏览器打开  https://github.com/new  新建仓库
echo     - 仓库名建议填：ethan-kang
echo     - 不要勾选 “Add a README file”
echo     - 点击 Create repository
echo.
echo  2. 在 Quick setup 下方点击 HTTPS，复制仓库地址
echo     以 https://github.com/ 开头
echo.
set "REPO="
set /p "REPO=  3. 粘贴仓库地址后按回车: "
if "%REPO%"=="" (
  echo [错误] 仓库地址不能为空。
  pause
  exit /b 1
)
git remote add origin "%REPO%"
if errorlevel 1 (
  echo [错误] 添加远程仓库失败，请检查地址是否正确。
  pause
  exit /b 1
)
echo [成功] 已添加远程仓库：%REPO%
echo.

:commit
echo 正在收集并提交最新改动 ...
git add -A
git diff --cached --quiet
if errorlevel 1 goto docommit
echo [信息] 没有新的改动需要提交，直接推送。
echo.
goto dopush

:docommit
git commit -m "deploy: update personal site"
if errorlevel 1 goto commitfail
echo [成功] 改动已提交。
echo.

:dopush
echo 正在推送代码到 GitHub，首次可能需要输入凭据 ...
echo.
git push -u origin main
if errorlevel 1 goto pushfail

echo.
echo ============================================
echo  [成功] 代码已推送！
echo --------------------------------------------
echo  启用公网访问（只需做一次）：
echo    1. 打开你的 GitHub 仓库页面，点击 Settings
echo    2. 左侧菜单选择 Pages
echo    3. Source 选 Deploy from a branch
echo    4. Branch 选 main，文件夹选 root，点 Save
echo    5. 等待 1-2 分钟
echo.
echo  完成后公网访问地址：
echo    https://你的用户名.github.io/仓库名/
echo ============================================
echo.
pause
exit /b 0

:commitfail
echo.
echo [错误] 提交失败，可能是未配置 Git 用户信息，请运行：
echo        git config --global user.name "你的名字"
echo        git config --global user.email "你的邮箱"
echo 然后重新双击本脚本。
echo.
pause
exit /b 1

:pushfail
echo.
echo [失败] 推送失败，常见原因：
echo    1. 未在本机登录 GitHub —— HTTPS 方式需用 Personal Access Token 作为密码
echo       生成地址：https://github.com/settings/tokens  勾选 repo 权限
echo    2. 仓库地址不正确，或没有推送权限
echo    3. 远程仓库已有内容（如勾选了 README），导致冲突
echo       可删除远程仓库重建一个空仓库再试
echo.
echo 可随时重新双击本脚本再次尝试。
echo.
pause
exit /b 1

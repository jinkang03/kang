@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   Ethan Kang - ������ҳ �� һ������ GitHub
echo ============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [����] δ��⵽ Git�����Ȱ�װ��
  echo        https://git-scm.com/download/win
  echo ��װ��ɺ�����˫�����ű����ɡ�
  echo.
  pause
  exit /b 1
)

REM ��� origin Զ���Ƿ�������
git remote get-url origin >nul 2>nul
if errorlevel 1 goto setup

echo [��Ϣ] ������Զ�ֿ̲⡣
echo.
goto commit

:setup
echo.
echo �״β����밴���²��������
echo --------------------------------------------
echo  1. �������  https://github.com/new  �½��ֿ�
echo     - �ֿ��������ethan-kang
echo     - ��Ҫ��ѡ ��Add a README file��
echo     - ��� Create repository
echo.
echo  2. �� Quick setup �·���� HTTPS�����Ʋֿ��ַ
echo     �� https://github.com/ ��ͷ
echo.
set "REPO="
set /p "REPO=  3. ճ���ֿ��ַ�󰴻س�: "
if "%REPO%"=="" (
  echo [����] �ֿ��ַ����Ϊ�ա�
  pause
  exit /b 1
)
git remote add origin "%REPO%"
if errorlevel 1 (
  echo [����] ����Զ�ֿ̲�ʧ�ܣ������ַ�Ƿ���ȷ��
  pause
  exit /b 1
)
echo [�ɹ�] ������Զ�ֿ̲⣺%REPO%
echo.

:commit
echo �����ռ����ύ���¸Ķ� ...
git add -A
git diff --cached --quiet
if errorlevel 1 goto docommit
echo [��Ϣ] û���µĸĶ���Ҫ�ύ��ֱ�����͡�
echo.
goto dopush

:docommit
git commit -m "deploy: update personal site"
if errorlevel 1 goto commitfail
echo [�ɹ�] �Ķ����ύ��
echo.

:dopush
echo �������ʹ��뵽 GitHub���״ο�����Ҫ����ƾ�� ...
echo.
git push -u origin main
if errorlevel 1 goto pushfail

echo.
echo ============================================
echo  [�ɹ�] ���������ͣ�
echo --------------------------------------------
echo  ���ù������ʣ�ֻ����һ�Σ���
echo    1. ����� GitHub �ֿ�ҳ�棬��� Settings
echo    2. ���˵�ѡ�� Pages
echo    3. Source ѡ Deploy from a branch
echo    4. Branch ѡ main���ļ���ѡ root���� Save
echo    5. �ȴ� 1-2 ����
echo.
echo  ��ɺ������ʵ�ַ��
echo    https://����û���.github.io/�ֿ���/
echo ============================================
echo.
pause
exit /b 0

:commitfail
echo.
echo [����] �ύʧ�ܣ�������δ���� Git �û���Ϣ�������У�
echo        git config --global user.name "�������"
echo        git config --global user.email "�������"
echo Ȼ������˫�����ű���
echo.
pause
exit /b 1

:pushfail
echo.
echo [ʧ��] ����ʧ�ܣ�����ԭ��
echo    1. δ�ڱ�����¼ GitHub ���� HTTPS ��ʽ���� Personal Access Token ��Ϊ����
echo       ���ɵ�ַ��https://github.com/settings/tokens  ��ѡ repo Ȩ��
echo    2. �ֿ��ַ����ȷ����û������Ȩ��
echo    3. Զ�ֿ̲��������ݣ��繴ѡ�� README�������³�ͻ
echo       ��ɾ��Զ�ֿ̲��ؽ�һ���ղֿ�����
echo.
echo ����ʱ����˫�����ű��ٴγ��ԡ�
echo.
pause
exit /b 1

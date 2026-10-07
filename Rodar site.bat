@echo off
rem Rodar o site Unitech Solution neste computador: basta dar duplo clique neste ficheiro.
rem O site abre no browser (http://localhost:5500). Para parar, feche a janela preta.
title Unitech Solution - site local
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   O Node.js nao esta instalado neste computador.
  echo   Instale a versao LTS em https://nodejs.org e volte a abrir este ficheiro.
  echo.
  pause
  exit /b 1
)

node serve.js --open

rem codigo 2 = o site ja estava a correr noutra janela; o browser foi aberto e esta janela fecha-se
if %errorlevel%==2 (
  timeout /t 4 /nobreak >nul
  exit /b 0
)
echo.
echo   O site parou.
pause

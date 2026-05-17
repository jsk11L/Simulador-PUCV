@echo off
REM ============================================================
REM Build standalone — produce simula.exe en la raíz del repo.
REM
REM Pasos:
REM   1. Compila el frontend (Vite) con VITE_API_BASE_URL vacío
REM      (rutas relativas → mismo host que el backend embebido).
REM   2. Copia frontend\dist al backend\frontend_dist para que
REM      //go:embed all:frontend_dist lo incluya en el binario.
REM   3. go build con stripping de símbolos (-s -w) y DB_TYPE=sqlite
REM      por default.
REM
REM Uso: doble click sobre este .bat, o desde cmd:
REM   build-standalone.bat
REM ============================================================
setlocal enabledelayedexpansion

echo.
echo [1/4] Construyendo frontend...
cd frontend
call npm install || goto :err
set VITE_API_BASE_URL=
call npm run build || goto :err
cd ..

echo.
echo [2/4] Copiando dist al backend...
if exist backend\frontend_dist rmdir /s /q backend\frontend_dist
mkdir backend\frontend_dist
xcopy /s /e /q /y frontend\dist\* backend\frontend_dist\ || goto :err

echo.
echo [3/4] Compilando binario standalone (sin consola)...
cd backend
call go mod tidy || goto :err
REM -H=windowsgui evita que Windows abra una ventana de consola al
REM ejecutar el .exe. Los logs van a %USERPROFILE%\.simulapucv\log.txt
REM (ver setupStandaloneLogging en main.go).
call go build -ldflags="-s -w -H=windowsgui" -o ..\simula.exe . || goto :err
cd ..

echo.
echo [4/4] Listo. Ejecutable: simula.exe
echo.
dir simula.exe | findstr simula.exe

echo.
echo ============================================================
echo Para probar:  simula.exe
echo Abrirá automáticamente http://localhost:8080
echo BD local en:  %%USERPROFILE%%\.simulapucv\datos.db
echo ============================================================
goto :eof

:err
echo.
echo ERROR — paso fallido. Revisa la salida anterior.
exit /b 1

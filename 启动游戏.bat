@echo off
chcp 65001 >nul
title Neon Starfighter 霓虹星际战机
echo ============================================
echo   《霓虹深空》启动中...
echo ============================================

REM 检查服务器是否已在运行（端口 7457）
netstat -ano | findstr ":7457" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo 服务器已在运行。
) else (
    echo 启动游戏服务器...
    start /min "" node "%~dp0serve-game.js" 7457
    timeout /t 2 /nobreak >nul
)

echo 打开浏览器...
start http://localhost:7457/

echo.
echo 已在浏览器打开游戏！
echo - 点击页面激活音效
echo - WASD / 方向键 / 按住拖动 移动
echo - 关闭本窗口不会影响游戏，但关机后需重新双击本文件
timeout /t 5 >nul



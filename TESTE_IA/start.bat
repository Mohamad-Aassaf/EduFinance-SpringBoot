@echo off
REM ====================================================
REM  TESTE_IA - Ollama Tester (mistral:7b)
REM  Certifique-se que o Ollama está rodando:
REM    ollama serve
REM ====================================================

echo ==========================================
echo  TESTE_IA - Spring Boot
echo  Modelo: mistral:7b (local)
echo  Acesse: http://localhost:8085
echo ==========================================

cd /d "%~dp0"
mvn spring-boot:run
pause

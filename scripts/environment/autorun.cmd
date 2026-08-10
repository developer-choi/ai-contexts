@echo off
rem Deployed to %USERPROFILE%\autorun.cmd by AC "npm run sync:environment".
rem Registered as cmd.exe AutoRun, so this runs before EVERY cmd.exe session.
rem
rem [CRITICAL] ASCII only - cmd.exe reads this in the OEM codepage and non-ASCII
rem comments corrupt line parsing.
rem [CRITICAL] No pipes, no external programs. A pipe spawns extra cmd.exe children
rem that re-enter AutoRun, leaving a process waiting on input that blocks any call
rem with a fresh console. See backlog/archives/incident/cmd-autorun-incident.md
rem
rem Directory check goes first so non-home sessions exit on line one.
if /i not "%CD%"=="%USERPROFILE%" goto :eof
for %%A in (%CMDCMDLINE%) do if /i "%%~A"=="/c" goto :eof
cd /d "%USERPROFILE%\WebstormProjects\main"

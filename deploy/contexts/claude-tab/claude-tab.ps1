param(
  [Parameter(Mandatory)][string]$Name,
  [Parameter(Mandatory)][string]$Model,
  [string]$Dir = (Get-Location).Path,
  [string]$Effort,
  [string]$Prompt
)

# 부른 세션의 변수를 물려받으면 새 세션이 하위 세션으로 잡혀 기록 저장이 꺼지고, 세션 ID·메시지 채널이 섞이고, 색이 빠진다
$leaked = @(Get-ChildItem env: | Where-Object { $_.Name -like 'CLAUDE*' -or $_.Name -in 'NO_COLOR', 'GIT_TERMINAL_PROMPT' } | ForEach-Object Name)
foreach ($var in $leaked) { Remove-Item "env:$var" }

$claudeArgs = @('--model', $Model, '--name', $Name)
if ($Effort) { $claudeArgs += @('--effort', $Effort) }
if ($Prompt) { $claudeArgs += $Prompt }

wt -w 0 new-tab --title $Name -d $Dir claude @claudeArgs

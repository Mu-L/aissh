!macro customInit
  ; 1. 强制结束所有可能的残留进程
  nsExec::Exec "taskkill /F /IM $\"方块SSH助手.exe$\" /T"
  nsExec::Exec "taskkill /F /IM $\"bintelai-ssh-assistant.exe$\" /T"
  nsExec::Exec "taskkill /F /IM $\"node.exe$\" /T"
  
  ; 等待进程释放文件句柄
  Sleep 1000

  ; 2. 强力清理安装目录 (对应 powershell.md 中的第 2 步)
  ; 注意：$LOCALAPPDATA\Programs\bintelai-ssh-assistant 是默认安装路径
  RMDir /r "$LOCALAPPDATA\Programs\bintelai-ssh-assistant"

  ; 再次等待以确保文件系统响应
  Sleep 500
!macroend

!macro customUnInit
  nsExec::Exec "taskkill /F /IM $\"方块SSH助手.exe$\" /T"
  nsExec::Exec "taskkill /F /IM $\"bintelai-ssh-assistant.exe$\" /T"
  nsExec::Exec "taskkill /F /IM $\"node.exe$\" /T"
!macroend

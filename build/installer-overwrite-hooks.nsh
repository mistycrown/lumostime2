; UTF-8
; Retry-based cleanup hooks for Windows overwrite installs.
; Root fix:
;   - override the old uninstaller's file-removal step during upgrades
;   - retry the default atomic move strategy several times
;   - fall back to direct removal so transient locks do not force manual cleanup
; Compatibility bridge:
;   - tolerate legacy uninstaller exit code 2 while older installed versions
;     are still in the field and have not yet been rebuilt with this hook

!macro _continueAfterLegacyCleanupError
  ClearErrors
  ${if} $R0 == 2
    DetailPrint "Legacy uninstaller reported cleanup error code 2. Continuing with overwrite install."
    StrCpy $R0 0
  ${endif}
!macroend

!macro customHeader
!ifdef BUILD_UNINSTALLER
Function un.removeInstallDirWithRetries
  Var /GLOBAL cleanupAttempt
  Var /GLOBAL cleanupFailurePath

  StrCpy $cleanupAttempt 0

  RetryAtomicCleanup:
    IntOp $cleanupAttempt $cleanupAttempt + 1

    RMDir /r "$PLUGINSDIR\old-install"
    CreateDirectory "$PLUGINSDIR\old-install"

    Push ""
    Call un.atomicRMDir
    Pop $cleanupFailurePath

    ${if} $cleanupFailurePath == 0
      RMDir /r $INSTDIR
      Return
    ${endif}

    DetailPrint "Atomic cleanup attempt $cleanupAttempt failed on: $cleanupFailurePath"

    Push ""
    Call un.restoreFiles
    Pop $R0

    RMDir /r "$PLUGINSDIR\old-install"

    ${if} $cleanupAttempt < 8
      Sleep 1000
      Goto RetryAtomicCleanup
    ${endif}

  StrCpy $cleanupAttempt 0

  RetryDirectCleanup:
    IntOp $cleanupAttempt $cleanupAttempt + 1
    ClearErrors
    RMDir /r $INSTDIR
    IfErrors 0 DirectCleanupDone

    DetailPrint "Direct cleanup attempt $cleanupAttempt failed for: $INSTDIR"

    ${if} $cleanupAttempt < 8
      Sleep 1000
      Goto RetryDirectCleanup
    ${endif}

    DetailPrint "Continuing upgrade with remaining files in place after cleanup retries."

  DirectCleanupDone:
FunctionEnd
!endif
!macroend

!macro customRemoveFiles
  ${if} ${isUpdated}
    Call un.removeInstallDirWithRetries
  ${else}
    RMDir /r $INSTDIR
  ${endif}
!macroend

!macro customUnInstallCheck
  !insertmacro _continueAfterLegacyCleanupError
!macroend

!macro customUnInstallCheckCurrentUser
  !insertmacro _continueAfterLegacyCleanupError
!macroend

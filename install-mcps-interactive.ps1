<# ============================================================================
 install-mcps-interactive.ps1 — Installer MCP interattivo per Claude Code (Windows)

 ISTRUZIONI:
 1) Apri PowerShell nella cartella del file
 2) (facoltativo) sblocca l'esecuzione per la sola sessione:
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
 3) Esegui lo script:
    .\install-mcps-interactive.ps1

 COSA FA:
 - Ti fa scegliere quali server MCP aggiungere a Claude Code (scope a scelta).
 - Opzioni disponibili:
   1) spec-kit (stdio, npx)
   2) chrome-devtools (stdio, npx)
   3) playwright (stdio, npx)
   4) github-remote (HTTP)
   5) github-local (stdio via Docker; richiede PAT)
   6) supabase (HTTP)
   7) netlify (stdio, npx)
   8) linear (SSE)

 PREREQUISITI:
 - CLI di Claude Code disponibile come comando `claude`.
 - Node.js + npx per i server via npm (1,2,3,7).
 - Docker per 5) github-local.
 - (Solo per 5) variabile env GITHUB_PERSONAL_ACCESS_TOKEN, oppure verrà chiesta.
============================================================================ #>

$ErrorActionPreference = 'Stop'

function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Say($msg) { Write-Host "`n$msg" -ForegroundColor White -BackgroundColor DarkBlue }
function Warn($msg){ Write-Host $msg -ForegroundColor Yellow }
function Ok($msg)  { Write-Host $msg -ForegroundColor Green }

# --- Precheck base ---
Say "Verifica prerequisiti…"
if (-not (Have 'claude')) { Write-Error "Manca 'claude' (Claude Code CLI). Apri Claude Code e abilita la CLI dalle impostazioni." }

# --- Scelta scope ---
Write-Host "`nScegli lo scope di configurazione MCP:"
Write-Host "  user    → disponibile in tutte le workspace (consigliato)"
Write-Host "  project → legato alla cartella corrente"
Write-Host "  local   → solo nella sessione/contesto locale"
$scope = Read-Host "Scope [user/project/local] (default: user)"
if ([string]::IsNullOrWhiteSpace($scope)) { $scope = 'user' }

# --- Menu scelte ---
Write-Host "`nSeleziona i server MCP da installare; inserisci i numeri separati da spazio (es. 1 3 6):"
Write-Host "  1) spec-kit"
Write-Host "  2) chrome-devtools"
Write-Host "  3) playwright"
Write-Host "  4) github-remote (HTTP)"
Write-Host "  5) github-local  (Docker + PAT)"
Write-Host "  6) supabase (HTTP)"
Write-Host "  7) netlify"
Write-Host "  8) linear (SSE)"
$choices = (Read-Host "Scelte").Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)

# --- Helper per aggiungere MCP ---
function Add-Mcp {
  param(
    [Parameter(Mandatory=$true)] [string]$Name,
    [Parameter(Mandatory=$true)] [string[]]$Args
  )
  try {
    Write-Host "→ Aggiungo $Name…" -ForegroundColor Cyan
    & claude mcp add --scope $scope @Args
    Ok "   $Name aggiunto."
  } catch {
    Warn "   $Name: già presente o errore. $_"
  }
}

# --- Dipendenze per gruppi ---
$needNode = $false
$needDocker = $false
if ($choices -match '^(1|2|3|7)$') { $needNode = $true }          # npx-based
if ($choices -contains '5') { $needDocker = $true }               # github-local

if ($needNode) {
  if (-not (Have 'node')) { Warn "⚠︎ Node.js non trovato: i server via npx potrebbero fallire." }
  if (-not (Have 'npx'))  { Warn "⚠︎ npx non trovato." }
}
if ($needDocker -and -not (Have 'docker')) { Warn "⚠︎ Docker non trovato: github-local verrà saltato." }

# --- PAT per github-local ---
if ($choices -contains '5') {
  if (-not $env:GITHUB_PERSONAL_ACCESS_TOKEN) {
    $pat = Read-Host "Inserisci il tuo GitHub PAT (solo per github-local; invio per saltare)"
    if ($pat) { $env:GITHUB_PERSONAL_ACCESS_TOKEN = $pat }
  }
}

# --- Esecuzione scelte ---
foreach ($c in $choices) {
  switch ($c) {
    '1' {
      # spec-kit (stdio, via npx)
      if (Have 'npx') {
        Add-Mcp -Name 'spec-kit' -Args @('--transport','stdio','spec-kit','--','npx','-y','spec-kit-ui-mcp')
      } else { Warn "Salto spec-kit: npx non disponibile." }
    }
    '2' {
      # chrome-devtools (stdio, via npx)
      if (Have 'npx') {
        Add-Mcp -Name 'chrome-devtools' -Args @('--transport','stdio','chrome-devtools','--','npx','-y','chrome-devtools-mcp@latest')
      } else { Warn "Salto chrome-devtools: npx non disponibile." }
    }
    '3' {
      # playwright (stdio, via npx)
      if (Have 'npx') {
        Add-Mcp -Name 'playwright' -Args @('--transport','stdio','playwright','--','npx','-y','@playwright/mcp@latest')
      } else { Warn "Salto playwright: npx non disponibile." }
    }
    '4' {
      # github-remote (HTTP)
      Add-Mcp -Name 'github (remote)' -Args @('--transport','http','github','https://api.githubcopilot.com/mcp/')
    }
    '5' {
      # github-local (stdio via Docker) - richiede PAT
      if (Have 'docker') {
        if ($env:GITHUB_PERSONAL_ACCESS_TOKEN) {
          Add-Mcp -Name 'github-local' -Args @('--transport','stdio','github-local','--',
            'docker','run','-i','--rm','-e','GITHUB_PERSONAL_ACCESS_TOKEN','ghcr.io/github/github-mcp-server')
        } else {
          Warn "Salto github-local: manca GITHUB_PERSONAL_ACCESS_TOKEN."
        }
      } else { Warn "Salto github-local: Docker non disponibile." }
    }
    '6' {
      # supabase (HTTP)
      Add-Mcp -Name 'supabase' -Args @('--transport','http','supabase','https://mcp.supabase.com/mcp')
    }
    '7' {
      # netlify (stdio, via npx)
      if (Have 'npx') {
        # Nota: sintassi ufficiale per Claude: `claude mcp add netlify npx -- -y @netlify/mcp`
        Add-Mcp -Name 'netlify' -Args @('netlify','npx','--','-y','@netlify/mcp')
      } else { Warn "Salto netlify: npx non disponibile." }
    }
    '8' {
      # linear (SSE) — endpoint SSE
      Add-Mcp -Name 'linear' -Args @('--transport','sse','linear','https://mcp.linear.app/sse')
    }
    Default { Warn "Voce '$c' non riconosciuta. Saltata." }
  }
}

Ok "`n✅ Operazioni concluse."
Write-Host "`nSuggerimenti:" -ForegroundColor White
Write-Host "• In Claude Code digita /mcp per completare eventuali autenticazioni (OAuth) richieste dai server remoti."
Write-Host "• Elenco server:     claude mcp list"
Write-Host "• Rimozione server:  claude mcp remove <nome>"

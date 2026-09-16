param(
    [switch]$SmokeTest,
    [string]$SmokeAction
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

function Color([string]$Hex) {
    return [System.Drawing.ColorTranslator]::FromHtml($Hex)
}

$colors = @{
    Background = Color '#101b1c'
    Surface = Color '#172728'
    SurfaceRaised = Color '#203536'
    Border = Color '#365052'
    Text = Color '#edf6f1'
    Muted = Color '#a1b8b4'
    Accent = Color '#ff7848'
    AccentDark = Color '#bd4d28'
    Success = Color '#5bc9aa'
    Warning = Color '#ffd166'
    Error = Color '#ff8f76'
}

# Add future tools here. Commands are fixed intentionally: the toolbox never
# accepts arbitrary shell commands from its UI.
$actions = @(
    [pscustomobject]@{
        Id = 'android-release'; Category = 'Release'; Title = 'Build Android release'
        Description = 'Create a signed Play Store app bundle.'
        Tooltip = 'Runs the guided release builder. You will enter the version and keystore passwords in a separate secure console window.'
        Command = 'scripts\build-android-release.bat'; Interactive = $true; Confirm = $null
    },
    [pscustomobject]@{
        Id = 'open-bundle'; Category = 'Release'; Title = 'Open release output'
        Description = 'Browse versioned Play Store bundles.'
        Tooltip = 'Opens the outputs folder. Each successful release is stored under its version name with a clearly named .aab file.'
        Folder = 'outputs'
    },
    [pscustomobject]@{
        Id = 'import-levels'; Category = 'Levels'; Title = 'Import Pexels images'
        Description = 'Download and prepare level candidates.'
        Tooltip = 'Starts the guided Pexels importer. It asks for image count, topic, orientation, size, and replacement behavior.'
        Command = 'scripts\import-pexels-levels.bat'; Interactive = $true; Confirm = $null
    },
    [pscustomobject]@{
        Id = 'shuffle-levels'; Category = 'Levels'; Title = 'Shuffle level order'
        Description = 'Shuffle verified images or a server ID range.'
        Tooltip = 'Starts the guided shuffler. Verified mode changes the future publishing order; server mode can upload a reordered manifest.'
        Command = 'scripts\shuffle-levels.bat'; Interactive = $true
        Confirm = 'The shuffler can update the live server manifest if you choose Server mode. Continue?'
    },
    [pscustomobject]@{
        Id = 'publish-levels'; Category = 'Levels'; Title = 'Publish verified levels'
        Description = 'Upload approved images and their manifest.'
        Tooltip = 'Publishes the verified image set to the configured server. The script shows a preview and asks for YES before uploading.'
        Command = 'scripts\publish-verified-levels.bat'; Interactive = $true
        Confirm = 'This tool can upload images and replace the live levels manifest. Continue to the publishing preview?'
    },
    [pscustomobject]@{
        Id = 'open-levels'; Category = 'Levels'; Title = 'Open level assets'
        Description = 'Browse candidates, verified images, and manifests.'
        Tooltip = 'Opens the local level-assets directory in File Explorer.'
        Folder = 'level-assets'
    },
    [pscustomobject]@{
        Id = 'update-rules'; Category = 'Dependencies'; Title = 'Update Huzzle rules'
        Description = 'Install and validate the latest tagged rules release.'
        Tooltip = 'Downloads the newest Huzzle Rules tag, updates the vendored package and lockfile, then runs tests and a production build.'
        Command = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\update-huzzle-rules.ps1'; Interactive = $false; Confirm = $null
    },
    [pscustomobject]@{
        Id = 'update-soundtool'; Category = 'Dependencies'; Title = 'Update SoundTool'
        Description = 'Install and validate the latest tagged audio-engine release.'
        Tooltip = 'Downloads the newest private SoundTool tag, updates the vendored package and lockfile, then runs tests and a production build.'
        Command = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\update-soundtool.ps1'; Interactive = $false; Confirm = $null
    },
    [pscustomobject]@{
        Id = 'validate'; Category = 'Quality'; Title = 'Run full validation'
        Description = 'Build, test, and lint the project source.'
        Tooltip = 'Runs the production build, complete test suite, and source lint checks in sequence. This is the recommended check before a release.'
        Command = 'bun run build && bun test && bunx eslint app tests tools --ignore-pattern dist'; Interactive = $false; Confirm = $null
    },
    [pscustomobject]@{
        Id = 'tests'; Category = 'Quality'; Title = 'Run tests'
        Description = 'Execute the complete automated test suite.'
        Tooltip = 'Runs all Bun tests without creating a release build.'
        Command = 'bun test'; Interactive = $false; Confirm = $null
    },
    [pscustomobject]@{
        Id = 'build-web'; Category = 'Quality'; Title = 'Build web app'
        Description = 'Type-check and create production web assets.'
        Tooltip = 'Runs TypeScript validation and the Vite production build. Output is written to dist.'
        Command = 'bun run build'; Interactive = $false; Confirm = $null
    },
    [pscustomobject]@{
        Id = 'git-status'; Category = 'Quality'; Title = 'Review changed files'
        Description = 'Show the current Git working-tree status.'
        Tooltip = 'Lists modified and untracked files. It does not stage, commit, discard, or push anything.'
        Command = 'git status --short'; Interactive = $false; Confirm = $null
    },
    [pscustomobject]@{
        Id = 'android-sync'; Category = 'Android'; Title = 'Build and sync Android'
        Description = 'Refresh the Android project with current web assets.'
        Tooltip = 'Type-checks and builds in Android mode, then synchronizes Capacitor plugins and assets into the Android project.'
        Command = 'bun run android:build'; Interactive = $false; Confirm = $null
    },
    [pscustomobject]@{
        Id = 'android-studio'; Category = 'Android'; Title = 'Open Android Studio'
        Description = 'Open the native Android project.'
        Tooltip = 'Launches Android Studio through Capacitor using the existing android project.'
        Command = 'bun run android:open'; Interactive = $false; Confirm = $null
    },
    [pscustomobject]@{
        Id = 'project-folder'; Category = 'Project'; Title = 'Open project folder'
        Description = 'Browse the Huzzle repository in File Explorer.'
        Tooltip = 'Opens the project root. No files are changed.'
        Folder = '.'
    }
)

$script:activeProcess = $null
$script:activeTitle = $null
$script:lastExitCode = $null

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Huzzle Toolbox'
$form.StartPosition = 'CenterScreen'
$form.MinimumSize = New-Object System.Drawing.Size(940, 640)
$form.Size = New-Object System.Drawing.Size(1120, 760)
$form.BackColor = $colors.Background
$form.ForeColor = $colors.Text
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$form.AutoScaleMode = 'Dpi'

$header = New-Object System.Windows.Forms.Panel
$header.Dock = 'Top'
$header.Height = 86
$header.Padding = New-Object System.Windows.Forms.Padding(24, 16, 24, 10)
$header.BackColor = $colors.Background
$form.Controls.Add($header)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'Huzzle Toolbox'
$title.AutoSize = $true
$title.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 22)
$title.ForeColor = $colors.Text
$title.Location = New-Object System.Drawing.Point(22, 12)
$header.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = 'Build, validate, update, and manage levels from one place.'
$subtitle.AutoSize = $true
$subtitle.ForeColor = $colors.Muted
$subtitle.Location = New-Object System.Drawing.Point(25, 55)
$header.Controls.Add($subtitle)

$main = New-Object System.Windows.Forms.SplitContainer
$main.Dock = 'Fill'
$main.FixedPanel = 'Panel2'
$main.SplitterWidth = 4
$main.BackColor = $colors.Border
$main.Panel1.BackColor = $colors.Background
$main.Panel2.BackColor = $colors.Surface
$form.Controls.Add($main)
$main.BringToFront()

$actionsPanel = New-Object System.Windows.Forms.FlowLayoutPanel
$actionsPanel.Dock = 'Fill'
$actionsPanel.AutoScroll = $true
$actionsPanel.FlowDirection = 'TopDown'
$actionsPanel.WrapContents = $false
$actionsPanel.Padding = New-Object System.Windows.Forms.Padding(20, 8, 14, 20)
$actionsPanel.BackColor = $colors.Background
$main.Panel1.Controls.Add($actionsPanel)

$logHeader = New-Object System.Windows.Forms.Panel
$logHeader.Dock = 'Top'
$logHeader.Height = 58
$logHeader.Padding = New-Object System.Windows.Forms.Padding(16, 12, 12, 8)
$logHeader.BackColor = $colors.Surface
$main.Panel2.Controls.Add($logHeader)

$logTitle = New-Object System.Windows.Forms.Label
$logTitle.Text = 'Activity'
$logTitle.AutoSize = $true
$logTitle.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 12)
$logTitle.ForeColor = $colors.Text
$logTitle.Location = New-Object System.Drawing.Point(14, 17)
$logHeader.Controls.Add($logTitle)

$clearLog = New-Object System.Windows.Forms.Button
$clearLog.Text = 'Clear'
$clearLog.Width = 64
$clearLog.Height = 30
$clearLog.Anchor = 'Top,Right'
$clearLog.FlatStyle = 'Flat'
$clearLog.FlatAppearance.BorderColor = $colors.Border
$clearLog.BackColor = $colors.SurfaceRaised
$clearLog.ForeColor = $colors.Muted
$clearLog.Location = New-Object System.Drawing.Point(($main.Panel2.Width - 78), 13)
$logHeader.Controls.Add($clearLog)

$log = New-Object System.Windows.Forms.RichTextBox
$log.Dock = 'Fill'
$log.ReadOnly = $true
$log.BorderStyle = 'None'
$log.BackColor = $colors.Surface
$log.ForeColor = $colors.Text
$log.Font = New-Object System.Drawing.Font('Consolas', 9)
$log.DetectUrls = $false
$log.Padding = New-Object System.Windows.Forms.Padding(12)
$main.Panel2.Controls.Add($log)
$log.BringToFront()

$statusPanel = New-Object System.Windows.Forms.Panel
$statusPanel.Dock = 'Bottom'
$statusPanel.Height = 54
$statusPanel.Padding = New-Object System.Windows.Forms.Padding(16, 10, 16, 10)
$statusPanel.BackColor = $colors.SurfaceRaised
$main.Panel2.Controls.Add($statusPanel)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Ready'
$status.AutoEllipsis = $true
$status.ForeColor = $colors.Muted
$status.Dock = 'Fill'
$status.TextAlign = 'MiddleLeft'
$statusPanel.Controls.Add($status)

$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Dock = 'Right'
$progress.Width = 92
$progress.Style = 'Marquee'
$progress.MarqueeAnimationSpeed = 22
$progress.Visible = $false
$statusPanel.Controls.Add($progress)

$toolTip = New-Object System.Windows.Forms.ToolTip
$toolTip.AutoPopDelay = 12000
$toolTip.InitialDelay = 350
$toolTip.ReshowDelay = 150
$toolTip.ShowAlways = $true

function Append-Log([string]$Message, [string]$Kind = 'normal') {
    if ([string]::IsNullOrEmpty($Message)) { return }
    $log.SelectionStart = $log.TextLength
    $log.SelectionLength = 0
    switch ($Kind) {
        'error' { $log.SelectionColor = $colors.Error }
        'success' { $log.SelectionColor = $colors.Success }
        'muted' { $log.SelectionColor = $colors.Muted }
        default { $log.SelectionColor = $colors.Text }
    }
    $log.AppendText($Message + [Environment]::NewLine)
    $log.SelectionColor = $colors.Text
    $log.ScrollToCaret()
}

function Set-RunningState([bool]$Running, [string]$Message) {
    $progress.Visible = $Running
    $status.Text = $Message
    foreach ($button in $script:actionButtons) { $button.Enabled = -not $Running }
}

function Complete-Action([int]$ExitCode) {
    try {
        $script:lastExitCode = $ExitCode
        $titleText = $script:activeTitle
        $script:activeProcess = $null
        $script:activeTitle = $null
        if ($ExitCode -eq 0) {
            Append-Log "Completed: $titleText" 'success'
            Set-RunningState $false 'Ready'
        } else {
            Append-Log "$titleText failed with exit code $ExitCode." 'error'
            Set-RunningState $false 'Last action failed'
        }
        Append-Log ''
    } catch {
        $script:activeProcess = $null
        $script:activeTitle = $null
        $progress.Visible = $false
        $status.Text = 'Action finished; status refresh failed'
    }
}

function Start-ToolProcess($Action) {
    if ($script:activeProcess -and -not $script:activeProcess.HasExited) {
        [System.Windows.Forms.MessageBox]::Show(
            $form,
            'Wait for the current action to finish before starting another one.',
            'Huzzle Toolbox',
            'OK',
            'Information'
        ) | Out-Null
        return
    }

    if ($Action.Confirm) {
        $answer = [System.Windows.Forms.MessageBox]::Show(
            $form,
            $Action.Confirm,
            $Action.Title,
            'YesNo',
            'Warning'
        )
        if ($answer -ne 'Yes') { return }
    }

    if ($Action.Folder) {
        $path = [IO.Path]::GetFullPath((Join-Path $projectRoot $Action.Folder))
        if (-not (Test-Path -LiteralPath $path)) {
            [System.Windows.Forms.MessageBox]::Show(
                $form,
                "The folder does not exist yet:`n$path",
                $Action.Title,
                'OK',
                'Information'
            ) | Out-Null
            return
        }
        Start-Process explorer.exe -ArgumentList ('"{0}"' -f $path)
        Append-Log "Opened: $path" 'muted'
        return
    }

    Append-Log ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Action.Title) 'muted'
    Append-Log "> $($Action.Command)" 'muted'
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = 'cmd.exe'
    $startInfo.Arguments = '/d /s /c "' + $Action.Command + '"'
    $startInfo.WorkingDirectory = $projectRoot
    $startInfo.CreateNoWindow = -not $Action.Interactive
    $startInfo.UseShellExecute = [bool]$Action.Interactive

    if (-not $Action.Interactive) {
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        $startInfo.StandardOutputEncoding = [Text.Encoding]::UTF8
        $startInfo.StandardErrorEncoding = [Text.Encoding]::UTF8
    }

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $process.EnableRaisingEvents = $true
    $process.SynchronizingObject = $form
    $script:activeProcess = $process
    $script:activeTitle = $Action.Title
    Set-RunningState $true ("Running: " + $Action.Title)

    if (-not $Action.Interactive) {
        $process.add_OutputDataReceived({
            param($sender, $eventArgs)
            if ($null -eq $eventArgs.Data) { return }
            Append-Log $eventArgs.Data
        })
        $process.add_ErrorDataReceived({
            param($sender, $eventArgs)
            if ($null -eq $eventArgs.Data) { return }
            Append-Log $eventArgs.Data 'error'
        })
    }

    $process.add_Exited({
        param($sender, $eventArgs)
        Complete-Action $sender.ExitCode
    })

    try {
        if (-not $process.Start()) { throw 'Windows could not start the selected tool.' }
        if (-not $Action.Interactive) {
            $process.BeginOutputReadLine()
            $process.BeginErrorReadLine()
        } else {
            Append-Log 'Continue in the guided console window. The toolbox will unlock when it closes.' 'muted'
        }
    } catch {
        $script:activeProcess = $null
        $script:activeTitle = $null
        Set-RunningState $false 'Could not start action'
        Append-Log $_.Exception.Message 'error'
    }
}

$actionById = @{}
$script:actionButtons = New-Object System.Collections.Generic.List[System.Windows.Forms.Button]
$script:categoryLabels = New-Object System.Collections.Generic.List[System.Windows.Forms.Label]
$script:categoryFlows = New-Object System.Collections.Generic.List[System.Windows.Forms.FlowLayoutPanel]
$categories = $actions | Select-Object -ExpandProperty Category -Unique

foreach ($category in $categories) {
    $categoryLabel = New-Object System.Windows.Forms.Label
    $categoryLabel.Text = $category.ToUpperInvariant()
    $categoryLabel.Width = 638
    $categoryLabel.Height = 30
    $categoryLabel.Margin = New-Object System.Windows.Forms.Padding(4, 14, 4, 2)
    $categoryLabel.Padding = New-Object System.Windows.Forms.Padding(2, 8, 0, 0)
    $categoryLabel.ForeColor = $colors.Accent
    $categoryLabel.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 9)
    $actionsPanel.Controls.Add($categoryLabel)
    $script:categoryLabels.Add($categoryLabel)

    $categoryFlow = New-Object System.Windows.Forms.FlowLayoutPanel
    $categoryFlow.Width = 638
    $categoryFlow.AutoSize = $true
    $categoryFlow.WrapContents = $true
    $categoryFlow.Margin = New-Object System.Windows.Forms.Padding(0)
    $categoryFlow.BackColor = $colors.Background
    $actionsPanel.Controls.Add($categoryFlow)
    $script:categoryFlows.Add($categoryFlow)

    foreach ($action in ($actions | Where-Object Category -eq $category)) {
        $actionById[$action.Id] = $action
        $button = New-Object System.Windows.Forms.Button
        $button.Tag = $action.Id
        $button.Text = $action.Title + [Environment]::NewLine + $action.Description
        $button.Width = 303
        $button.Height = 72
        $button.Margin = New-Object System.Windows.Forms.Padding(4)
        $button.Padding = New-Object System.Windows.Forms.Padding(10, 5, 10, 5)
        $button.FlatStyle = 'Flat'
        $button.FlatAppearance.BorderColor = $colors.Border
        $button.FlatAppearance.MouseOverBackColor = $colors.SurfaceRaised
        $button.BackColor = $colors.Surface
        $button.ForeColor = $colors.Text
        $button.TextAlign = 'MiddleLeft'
        $button.Cursor = 'Hand'
        $toolTip.SetToolTip($button, $action.Tooltip)
        $button.Add_Click({
            param($sender, $eventArgs)
            Start-ToolProcess $actionById[[string]$sender.Tag]
        })
        $categoryFlow.Controls.Add($button)
        $script:actionButtons.Add($button)
    }
}

function Update-ToolboxLayout {
    $availableWidth = [Math]::Max(
        300,
        $actionsPanel.ClientSize.Width - $actionsPanel.Padding.Horizontal - 24
    )
    $buttonWidth = $availableWidth - 8
    if ($availableWidth -ge 590) {
        $buttonWidth = [Math]::Floor(($availableWidth - 16) / 2)
    }
    foreach ($label in $script:categoryLabels) { $label.Width = $availableWidth }
    foreach ($flow in $script:categoryFlows) { $flow.Width = $availableWidth }
    foreach ($button in $script:actionButtons) { $button.Width = $buttonWidth }
    $clearLog.Left = [Math]::Max(8, $main.Panel2.ClientSize.Width - 78)
}

$clearLog.Add_Click({ $log.Clear() })
$main.add_SizeChanged({ Update-ToolboxLayout })
$actionsPanel.add_SizeChanged({ Update-ToolboxLayout })
$form.Add_Shown({
    $main.Panel1MinSize = 480
    $main.Panel2MinSize = 340
    $preferredActivityWidth = [Math]::Min(430, [Math]::Max(360, [Math]::Round($main.ClientSize.Width * 0.38)))
    $main.SplitterDistance = $main.ClientSize.Width - $preferredActivityWidth - $main.SplitterWidth
    Update-ToolboxLayout
})
$form.Add_FormClosing({
    param($sender, $eventArgs)
    if ($script:activeProcess -and -not $script:activeProcess.HasExited) {
        $answer = [System.Windows.Forms.MessageBox]::Show(
            $form,
            'A tool is still running. Close the toolbox anyway? The tool may continue in its own window.',
            'Huzzle Toolbox',
            'YesNo',
            'Warning'
        )
        if ($answer -ne 'Yes') { $eventArgs.Cancel = $true }
    }
})

Append-Log 'Huzzle Toolbox is ready.' 'success'
Append-Log 'Hover over any action for details. Only one action can run at a time.' 'muted'
foreach ($dependency in @('bun', 'git', 'scp')) {
    if (Get-Command $dependency -ErrorAction SilentlyContinue) {
        Append-Log ("Available: " + $dependency) 'muted'
    } else {
        Append-Log ("Command not found: " + $dependency) 'error'
    }
}

if ($SmokeAction) {
    $smokeTool = $actions | Where-Object Id -eq $SmokeAction | Select-Object -First 1
    if (-not $smokeTool) { throw "Unknown smoke-test action: $SmokeAction" }
    if ($smokeTool.Interactive -or $smokeTool.Folder) {
        throw 'Smoke-test actions must run inside the toolbox.'
    }
    $form.ShowInTaskbar = $false
    $form.Opacity = 0
    $form.Show()
    Start-ToolProcess $smokeTool
    $deadline = [DateTime]::UtcNow.AddSeconds(30)
    while ($null -ne $script:activeProcess -and [DateTime]::UtcNow -lt $deadline) {
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 25
    }
    if ($null -ne $script:activeProcess) { throw 'Smoke-test action timed out.' }
    if ($form.IsDisposed) { throw 'The toolbox closed after its action finished.' }
    if ($script:lastExitCode -ne 0) { throw "Smoke-test action failed with exit code $script:lastExitCode." }
    if ($main.Panel2.ClientSize.Width -lt 340) {
        throw "The Activity pane initialized too narrowly: $($main.Panel2.ClientSize.Width)px."
    }
    $activityWidth = $main.Panel2.ClientSize.Width
    $form.Close()
    $form.Dispose()
    Write-Output "Huzzle Toolbox remained open after '$SmokeAction' completed with a ${activityWidth}px Activity pane."
    exit 0
}

if ($SmokeTest) {
    Write-Output "Huzzle Toolbox smoke test passed with $($actions.Count) actions."
    $form.Dispose()
    exit 0
}

[void]$form.ShowDialog()

param(
  [Parameter(Mandatory = $true)]
  [string]$WorkbookPath,
  [string]$MigrationPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (-not $MigrationPath) {
  $MigrationPath = Join-Path $PSScriptRoot '..\supabase\migrations\202607200001_households_and_residency.sql'
}

$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $WorkbookPath))

function Read-ZipEntry([string]$name) {
  $entry = $zip.GetEntry($name)
  if (-not $entry) { throw "XLSX entry not found: $name" }
  $reader = [System.IO.StreamReader]::new($entry.Open())
  try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

try {
  [xml]$sharedXml = Read-ZipEntry 'xl/sharedStrings.xml'
  $shared = @($sharedXml.sst.si | ForEach-Object { $_.InnerText })
  [xml]$sheet = Read-ZipEntry 'xl/worksheets/sheet1.xml'
  $records = @()

  foreach ($row in @($sheet.worksheet.sheetData.row)) {
    if ([int]$row.r -lt 5) { continue }
    $cells = @{}
    foreach ($cell in @($row.c)) {
      $value = if ($cell.t -eq 's') {
        $shared[[int]$cell.v]
      } elseif ($cell.t -eq 'inlineStr') {
        $cell.is.InnerText
      } else {
        $cell.v
      }
      $column = ([regex]::Match([string]$cell.r, '^[A-Z]+')).Value
      $cells[$column] = $value
    }

    if ($cells['B'] -and $cells['C'] -and $cells['D']) {
      $records += [pscustomobject]@{
        Building = [int][double]$cells['B']
        Unit = [int][double]$cells['C']
        Area = ([decimal]$cells['D']).ToString('0.00', [Globalization.CultureInfo]::InvariantCulture)
      }
    }
  }
} finally {
  $zip.Dispose()
}

$keys = @($records | ForEach-Object { "$($_.Building)-$($_.Unit)" } | Sort-Object -Unique)
if ($records.Count -ne 734 -or $keys.Count -ne 734) {
  throw "Expected 734 unique households, found $($records.Count) rows and $($keys.Count) unique keys."
}

$values = for ($index = 0; $index -lt $records.Count; $index++) {
  $record = $records[$index]
  $suffix = if ($index -eq $records.Count - 1) { '' } else { ',' }
  "  ($($record.Building), $($record.Unit), $($record.Area))$suffix"
}

$resolvedMigration = Resolve-Path -LiteralPath $MigrationPath
$sql = [IO.File]::ReadAllText($resolvedMigration)
$beginMarker = '-- HOUSEHOLD_VALUES_BEGIN'
$endMarker = '-- HOUSEHOLD_VALUES_END'
$beginIndex = $sql.IndexOf($beginMarker)
$endIndex = $sql.IndexOf($endMarker)
if ($beginIndex -lt 0 -or $endIndex -le $beginIndex) {
  throw 'Migration household value markers were not found.'
}
$replacement = $beginMarker + [Environment]::NewLine + ($values -join [Environment]::NewLine) + [Environment]::NewLine
$sql = $sql.Substring(0, $beginIndex) + $replacement + $sql.Substring($endIndex)
[IO.File]::WriteAllText($resolvedMigration, $sql, [Text.UTF8Encoding]::new($false))

Write-Output "Generated $($records.Count) unique household rows in $resolvedMigration"

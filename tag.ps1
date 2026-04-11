param(
    [Parameter(Mandatory)]
    [string]$Version,

    [Parameter(Mandatory)]
    [string]$Message
)

git tag $Version -m $Message
git push origin $Version
Write-Host "Tag $Version created and pushed." -ForegroundColor Green

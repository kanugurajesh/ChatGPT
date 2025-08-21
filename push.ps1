param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage
)

try {
    Write-Host "Adding changes..." -ForegroundColor Green
    git add .
    
    Write-Host "Committing changes with message: '$CommitMessage'" -ForegroundColor Green
    git commit -m $CommitMessage
    
    Write-Host "Pushing to GitHub..." -ForegroundColor Green
    git push
    
    Write-Host "Successfully pushed changes to GitHub!" -ForegroundColor Green
}
catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
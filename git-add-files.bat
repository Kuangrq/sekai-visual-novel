@echo off
echo Adding modified files...
git add src/app/api/story/route.ts
git add src/components/AudioControls.tsx
git add src/components/VisualNovel.tsx
git add src/lib/audioManager.ts

echo Adding new background image...
git add public/assets/homepage-background.jpg

echo Checking status...
git status

echo Done! Files have been added (excluding sounds/ directory)
pause

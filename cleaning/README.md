# Makeover Clean-Up Playable

Responsive playable ad prototype built from `docs/prd.txt`.

## Run

Serve the folder with any simple static server:

```powershell
cd E:\ladderproject\cleaning
python -m http.server 4173
```

Open `http://localhost:4173`.

## Included flow

- Pick one of three targets: car, tank, airplane
- Select a tool from the side tray or the mobile bottom tray
- Scratch-clean only when the selected tool matches the target
- Reach 90% cleaned state to clear the round
- Move to the next target or open the CTA

## Notes

- Change the CTA destination in `script.js` by editing `CTA_URL`
- Assets are loaded from `assets/model` and `assets/tools`

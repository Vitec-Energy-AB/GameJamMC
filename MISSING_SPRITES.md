# Missing Sprite Files

This document lists the sprite files that are currently missing from the `Sprites/` folder. The game currently uses canvas drawing with colors and emoji symbols instead of actual sprite images.

## Status

- ✅ **Resources/Titel.png** - Main menu title image (EXISTS and has been added to the UI)
- ❌ **Sprites/** folder - Currently empty (only contains a placeholder file)

## Recommended Sprites to Add

### 1. Character Sprites (4 characters)

Each character should have sprites for different states:

#### Bjork (Balanced character - Green #4CAF50)
- `Sprites/characters/bjork_idle.png` - Idle stance
- `Sprites/characters/bjork_walk.png` or animation frames - Walking animation
- `Sprites/characters/bjork_jump.png` - Jumping pose
- `Sprites/characters/bjork_attack.png` - Attack animation

#### Gnista (Fast & light character - Orange #FF9800)
- `Sprites/characters/gnista_idle.png`
- `Sprites/characters/gnista_walk.png`
- `Sprites/characters/gnista_jump.png`
- `Sprites/characters/gnista_attack.png`

#### Malm (Heavy hitter - Brown #795548)
- `Sprites/characters/malm_idle.png`
- `Sprites/characters/malm_walk.png`
- `Sprites/characters/malm_jump.png`
- `Sprites/characters/malm_attack.png`

#### Dimma (Triple jump acrobat - Purple #9C27B0)
- `Sprites/characters/dimma_idle.png`
- `Sprites/characters/dimma_walk.png`
- `Sprites/characters/dimma_jump.png`
- `Sprites/characters/dimma_attack.png`

### 2. Weapon Sprites (5 weapons)

- `Sprites/weapons/steelclub.png` - Steel club (Gray #95a5a6)
- `Sprites/weapons/energyblade.png` - Energy blade (Cyan #00cec9)
- `Sprites/weapons/fireaxe.png` - Fire axe (Orange-red #e17055)
- `Sprites/weapons/lightningspear.png` - Lightning spear (Yellow #fdcb6e)
- `Sprites/weapons/icecrystal.png` - Ice crystal (Blue #74b9ff)

### 3. Powerup Sprites (2 powerups)

- `Sprites/powerups/shieldsplitter.png` - Shield splitter (Red #e74c3c) - Increases damage output
- `Sprites/powerups/lifecore.png` - Life core (Green #2ecc71) - Restores health

### 4. Map Backgrounds (3 maps)

- `Sprites/maps/test-arena-bg.png` - Test arena background
- `Sprites/maps/steel-works-bg.png` - Steel works background (Industrial theme)
- `Sprites/maps/volcano-peak-bg.png` - Volcano peak background (Volcanic theme with lava)

### 5. Platform Sprites

- `Sprites/platforms/solid-platform.png` - Standard solid platform tile
- `Sprites/platforms/passthrough-platform.png` - Pass-through platform tile
- `Sprites/platforms/moving-platform.png` - Moving platform tile
- `Sprites/platforms/crumbling-platform.png` - Crumbling platform tile

### 6. Effect Sprites

- `Sprites/effects/bomb.png` - Bomb sprite (replaces current circle drawing)
- `Sprites/effects/explosion.png` - Explosion effect (or multiple frames for animation)
- `Sprites/effects/hit-impact.png` - Hit effect when attacks land
- `Sprites/effects/block-shield.png` - Shield effect when blocking
- `Sprites/effects/freeze-effect.png` - Freeze effect overlay
- `Sprites/effects/invulnerable-flash.png` - Invulnerability visual effect

### 7. UI Elements

- `Sprites/ui/heart-icon.png` - Life/stock indicator icon
- `Sprites/ui/damage-meter-bg.png` - Damage percentage meter background
- `Sprites/ui/character-select-portraits/` - Portrait images for character selection
  - `bjork-portrait.png`
  - `gnista-portrait.png`
  - `malm-portrait.png`
  - `dimma-portrait.png`

## Sprite Specifications

### Recommended Sizes:
- **Characters**: 40x60 pixels (matching the game's PLAYER_W and PLAYER_H constants)
- **Weapons**: 20x20 pixels for icons, larger for in-hand sprites
- **Powerups**: 24x24 pixels
- **Platforms**: Tileable textures (e.g., 32x32 or 64x32)
- **Backgrounds**: 1200x700 pixels (matching CANVAS_W and CANVAS_H)
- **Effects**: Variable, typically 48x48 to 128x128

### File Format:
- PNG with transparency (RGBA)
- 32-bit color depth recommended

### Naming Convention:
- Use lowercase
- Use hyphens for multi-word names
- Group by category in subdirectories

## Current Rendering Status

The game currently renders all visual elements programmatically using HTML5 Canvas:
- Characters are drawn as colored rectangles with eyes
- Weapons and powerups are drawn as colored squares with emoji symbols
- Platforms are drawn with gradient fills
- Effects are drawn with radial gradients

Adding proper sprites would significantly improve the visual quality of the game!

## Implementation Notes

Once sprites are added to the `Sprites/` folder:

1. Update `server/index.ts` to serve sprites statically (already added for Resources):
   ```typescript
   app.use('/Sprites', express.static(path.join(__dirname, '../../Sprites')));
   ```

2. Modify rendering code in `client/index.html` to load and draw sprites instead of shapes
3. Create sprite loading system with fallback to current rendering if sprites are missing
4. Consider creating a sprite atlas for better performance

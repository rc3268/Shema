#!/usr/bin/env python3
"""
One-off: replace Capacitor's placeholder icons/splash with Shema's real branding,
matching the exact file paths/sizes the `cap add` scaffolding already generated.
Source assets are only 512px/979px -- good enough to replace a generic placeholder,
but a true 1024x1024 master icon should replace resources/icon.png before final
App Store submission for best quality (see context.md).
Run manually if the native projects are ever regenerated: python3 scripts/gen-native-icons.py
"""
import glob
import os
from PIL import Image

CREAM = (243, 241, 234)  # --cream, matches the app's own light background token

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)

icon = Image.open('shema-icon-512.png').convert('RGB')  # already maskable-safe per manifest.json
mark = Image.open('shema-mark-color.png').convert('RGBA')  # transparent bg, for splash composition


def square(img, size):
    return img.resize((size, size), Image.LANCZOS)


def splash_canvas(w, h):
    canvas = Image.new('RGB', (w, h), CREAM)
    mark_size = int(min(w, h) * 0.34)
    resized = mark.resize((mark_size, mark_size), Image.LANCZOS)
    canvas.paste(resized, ((w - mark_size) // 2, (h - mark_size) // 2), resized)
    return canvas


# --- Android launcher icons (legacy + adaptive foreground; both already safe-zoned) ---
for path in glob.glob('android/app/src/main/res/mipmap-*/ic_launcher.png'):
    size = Image.open(path).size[0]
    square(icon, size).save(path)
for path in glob.glob('android/app/src/main/res/mipmap-*/ic_launcher_round.png'):
    size = Image.open(path).size[0]
    square(icon, size).save(path)
for path in glob.glob('android/app/src/main/res/mipmap-*/ic_launcher_foreground.png'):
    size = Image.open(path).size[0]
    square(icon, size).save(path)

# --- Android splash (per density/orientation, matching whatever cap add already generated) ---
for path in glob.glob('android/app/src/main/res/drawable*/splash.png'):
    w, h = Image.open(path).size
    splash_canvas(w, h).save(path)

# --- iOS app icon: single 1024x1024 universal asset (modern single-size icon catalog) ---
ios_icon_path = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
if os.path.exists(ios_icon_path):
    square(icon, 1024).save(ios_icon_path)

# --- iOS splash: three identical 2732x2732 canvases (1x/2x/3x by Capacitor convention) ---
for path in glob.glob('ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732*.png'):
    w, h = Image.open(path).size
    splash_canvas(w, h).save(path)

print('Native icons/splash regenerated from shema-icon-512.png / shema-mark-color.png.')

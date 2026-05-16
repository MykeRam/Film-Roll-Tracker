# Film Stock Image Sources

These real film stock photos are sourced from Wikimedia Commons and are used as local form preview assets.

- `kodak-gold-200.jpg`: Wikimedia Commons, `File:Kodak-gold-200.jpg`, Runningboards, CC0.
- `kodak-portra-400.jpg`: Wikimedia Commons, `File:Kodak analog film reel Portra 400 (27940330389).jpg`, Markus Spiske, CC0.
- `kodak-ektar-100.jpg`: Wikimedia Commons, `File:Kodak Ektar 100 35mm 5312.jpg`, Ashley Pomeroy, CC BY 3.0.
- `ilford-hp5-plus.jpg`: Wikimedia Commons, `File:Ilford HP5 Plus - Black & white film.jpg`.

The `*-cutout.png` files are local alpha PNG derivatives generated from these sources, then resized for app use. For translucent film rolls like Portra 400, use a conservative color-key crop instead of full background segmentation so the roll stays intact.
The app falls back to generated SVG film stock art for stock names that do not have a matching local cutout.

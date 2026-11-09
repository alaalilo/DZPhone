# DZPhone — Product Image Sources & Provenance

## Image policy

- Bundled catalog illustrations are served as optimized WebP assets only.
- Their `source_type` is `illustrative_studio_render`; they represent the model, not a specific retail unit.
- A used phone may be marked `merchant_verified` only after the seller uploads actual photos of that exact unit and records its inspection.
- Merchant uploads are stored under the private persistent media directory and served through `/media/:filename`; their original format may be JPEG, PNG, or WebP.
- Never describe a generated model illustration as a real photograph of a used device.

## Bundled catalog assets

| Product ID | Condition | Primary WebP asset | Source type | Inspection status |
|---|---|---|---|---|
| `apple-iphone-15-pro-max-256-used` | `used_like_new` | `/images/products/iphone-15-pro-max-titanium.webp` | `illustrative_studio_render` | `illustrative_template` |
| `apple-iphone-13-128-used` | `used_like_new` | `/images/products/iphone-13-midnight-blue.webp` | `illustrative_studio_render` | `illustrative_template` |
| `samsung-galaxy-s24-ultra-256-used` | `used_like_new` | `/images/products/galaxy-s24-ultra-titanium.webp` | `illustrative_studio_render` | `illustrative_template` |
| `samsung-galaxy-a55-256-new` | `new_sealed` | `/images/products/galaxy-a55-iceblue-violet.webp` | `illustrative_studio_render` | `N/A (New Sealed)` |
| `redmi-note-13-pro-5g-256-new` | `new_sealed` | `/images/products/redmi-note-13-pro-black.webp` | `illustrative_studio_render` | `N/A (New Sealed)` |
| `poco-x6-pro-256-new` | `new_sealed` | `/images/products/poco-x6-pro-yellow.webp` | `illustrative_studio_render` | `N/A (New Sealed)` |

## Upload requirements for real used-device photos

1. Photograph the exact physical unit from front, back, frame, and screen.
2. Upload through the authenticated admin gallery; do not paste a public data URL.
3. Verify that the gallery shows the actual uploaded files.
4. Set inspection data to `merchant_verified` only after physically testing the device.
5. Keep one verified inspection record per individual used unit.

The bundled studio renders are illustrative catalog assets. This repository does not claim they are licensed manufacturer photography or evidence of a particular used phone's physical condition.

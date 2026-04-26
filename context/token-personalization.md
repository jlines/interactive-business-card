# Token Personalization Notes

Each QR token can contribute a small amount of personalization:
- `label`: human-readable name for where the card was used
- `audienceHint`: who the card was aimed at
- `customOpener`: first response seed
- `notes`: internal context for prompt assembly

## Boundaries
- Personalization should steer tone and opener only.
- Do not pretend to know the visitor's identity unless the token genuinely encodes that relationship.
- The opener should feel intentional, not creepy.

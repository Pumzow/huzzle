# Huzzle level workflow

Levels move through three local stages:

```text
level-assets/
  candidates/
    images/
    candidates.json
  verified/
  uploaded/
  levels.json
```

`level-assets` is local working data and is ignored by Git. There is no permanent
`published` folder. The publisher uses a temporary staging directory and removes
it when the command finishes.

## Configuration

Copy `.env.example` to `.env.local` and configure:

```env
PEXELS_API_KEY=your_key_here
HUZZLE_SCP_TARGET=your_scp_target_here
```

The SCP password is not stored in `.env.local`. Windows OpenSSH asks for it in
the terminal whenever a transfer starts.

## Download candidates

Run `import-pexels-levels.bat` or:

```powershell
bun run levels:download
```

The downloader asks for a target file size, defaulting to 500 KB. It preserves
the source dimensions and never crops. Images are converted to WebP beginning at
quality 90 and stepping down to quality 82. An image that is still larger than
the target at quality 82 is kept and reported as oversized.

Candidates are named `pexels-{imageId}.webp`. Published and downloaded Pexels
IDs are excluded from future searches unless an existing candidate is explicitly
replaced.

## Verify candidates

Review files in `level-assets/candidates/images`. Move approved files, without
renaming them, into `level-assets/verified`.

Only files named `pexels-{imageId}.webp` are accepted by the publisher.

## Publish verified levels

For the first development publish, replace the old manifest with the new numeric
format:

```powershell
publish-verified-levels.bat --reset
```

For later publishes, run:

```powershell
publish-verified-levels.bat
```

Without `--reset`, the publisher downloads the current remote `levels.json`
before assigning IDs. It rejects duplicate Pexels IDs, allocates the next numeric
level IDs, and shows a complete preview. Nothing is uploaded until `YES` is
entered.

SCP requests the password twice during upload: once for all images and once for
`levels.json`. Images are uploaded first. The manifest is uploaded last so an
image-transfer failure cannot expose incomplete levels to the game.

After a successful publish, approved source files move from `verified` to
`uploaded`, and the remote manifest is mirrored to `level-assets/levels.json`.

The published manifest is intentionally small:

```json
{
  "schemaVersion": 2,
  "revision": 1,
  "levels": [
    { "id": 0, "imageId": 11255414 },
    { "id": 1, "imageId": 1551440 }
  ]
}
```

The game derives image paths as `images/{id}.webp`. `imageId` prevents a Pexels
photo from being published more than once, and `revision` provides cache
invalidation.

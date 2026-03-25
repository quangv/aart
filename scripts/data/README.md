# Word Source Files

## Oxford 3000 Import

Place the full Oxford list at:

- `scripts/data/oxford3000.csv`

Expected CSV header:

```csv
word,cefr,part_of_speech
```

Required columns:

- `word` (single word; phrases are skipped)
- `cefr` (`A1`, `A2`, `B1`, `B2`, `C1`, optional `C2`)

Optional column:

- `part_of_speech` (mapped to app enum; unknown values become `other`)

Example file:

- `scripts/data/oxford3000.csv.example`

Reading-level mapping used by generator:

- `A1 -> 1`
- `A2 -> 2`
- `B1 -> 3`
- `B2 -> 4`
- `C1 -> 5`
- `C2 -> 6`

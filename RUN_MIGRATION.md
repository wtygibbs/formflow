# Database Migration Required

After pulling these changes, you need to run a database migration to add the bounding box fields.

## Run Migration

```bash
cd backend/AcordParser.API
dotnet ef migrations add AddFieldBoundingBoxes
dotnet ef database update
```

## What This Migration Adds

The migration will add two new columns to the `ExtractedFields` table:

1. **BoundingRegions** (nvarchar(MAX), nullable)
   - JSON array of polygon coordinates
   - Format: `[{"page":1,"polygon":[{"x":0.1,"y":0.2},...]}]`

2. **PageNumber** (int, nullable)
   - Page where the field appears (1-indexed)

## Rollback (if needed)

```bash
dotnet ef database update <PreviousMigrationName>
dotnet ef migrations remove
```

## Verify Migration

After running, check the database:

```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ExtractedFields'
AND COLUMN_NAME IN ('BoundingRegions', 'PageNumber');
```

Should return:
```
BoundingRegions | nvarchar | YES
PageNumber      | int      | YES
```

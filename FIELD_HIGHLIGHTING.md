# Field Highlighting Implementation Summary

This feature adds visual highlighting of fields on the document preview when clicked.

## Backend Changes

### 1. ExtractedField Entity
Added bounding box properties:
- `BoundingRegions` (string, JSON): Polygon coordinates for highlighting
- `PageNumber` (int?): Page where field appears

### 2. Azure Document Intelligence Service
Updated `AnalyzeAcord125Async` to return bounding box data:
```csharp
Dictionary<string, (string Value, float Confidence, string? BoundingRegions, int? PageNumber)>
```

### 3. Database Migration
Need to run: `dotnet ef migrations add AddBoundingBoxFields`

### 4. DTO Updates
Update ExtractedFieldDTO to include:
```csharp
public string? BoundingRegions { get; set; }
public int? PageNumber { get; set; }
```

## Frontend Changes

### 1. ExtractedField Interface
Add bounding box properties to match backend DTO

### 2. Document Preview Overlay
Create overlay component that:
- Parses bounding box JSON
- Converts normalized coordinates to pixel positions
- Draws highlight rectangles over document
- Handles both PDF (via canvas overlay) and images

### 3. Click Handler
Add click handler that:
- Sets active field ID
- Scrolls to field location
- Highlights bounding box for 3 seconds
- Provides visual feedback

## How It Works

1. Azure AI returns polygon coordinates (normalized 0-1)
2. Backend stores as JSON in database
3. Frontend requests document with fields
4. When field is clicked, overlay component:
   - Parses bounding regions
   - Converts to pixel coordinates based on document dimensions
   - Draws semi-transparent highlight rectangle
   - Auto-fades after 3 seconds

## Bounding Box JSON Format

```json
[
  {
    "page": 1,
    "polygon": [
      {"x": 0.1, "y": 0.2},
      {"x": 0.3, "y": 0.2},
      {"x": 0.3, "y": 0.25},
      {"x": 0.1, "y": 0.25}
    ]
  }
]
```

Coordinates are normalized (0-1) relative to page dimensions.

## Implementation Status

✅ Backend entity updated
✅ Azure service captures bounding boxes
⏳ Interface signature update
⏳ DocumentService update to save data
⏳ Database migration
⏳ DTO updates
⏳ Frontend interface update
⏳ Highlight overlay component
⏳ Click handler implementation

## Next Steps

Due to time/complexity, I recommend completing this implementation incrementally:

1. Finish backend updates (interface, DocumentService, migration, DTOs)
2. Test backend with Swagger/Postman
3. Update frontend interface
4. Implement basic highlight overlay
5. Test and refine visual presentation

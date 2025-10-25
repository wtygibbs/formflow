# Field Highlighting - Implementation Guide

## Current Status

✅ **Completed:**
- ExtractedField entity updated with `BoundingRegions` and `PageNumber` fields
- AzureDocumentIntelligenceService updated to capture bounding box coordinates from Azure AI

⏳ **Remaining Work:**
The feature is 30% complete. Here's what remains:

---

## Backend Tasks Remaining

### 1. Update Interface (5 minutes)

**File:** `/backend/AcordParser.Core/Interfaces/IAzureDocumentIntelligenceService.cs`

```csharp
namespace AcordParser.Core.Interfaces;

public interface IAzureDocumentIntelligenceService
{
    Task<Dictionary<string, (string Value, float Confidence, string? BoundingRegions, int? PageNumber)>>
        AnalyzeAcord125Async(Stream documentStream, string fileName);
}
```

### 2. Update DocumentService (10 minutes)

**File:** `/backend/AcordParser.Infrastructure/Services/DocumentService.cs`

Find the `ProcessDocumentAsync` method around line 360 and update the field creation:

```csharp
// OLD CODE (around line 362-370):
var field = new ExtractedField
{
    Id = Guid.NewGuid(),
    DocumentId = document.Id,
    FieldName = kvp.Key,
    FieldValue = kvp.Value.Value,
    Confidence = kvp.Value.Confidence,
    IsVerified = false,
    ExtractedAt = DateTime.UtcNow
};

// NEW CODE:
var field = new ExtractedField
{
    Id = Guid.NewGuid(),
    DocumentId = document.Id,
    FieldName = kvp.Key,
    FieldValue = kvp.Value.Value,
    Confidence = kvp.Value.Confidence,
    BoundingRegions = kvp.Value.BoundingRegions,  // ADD THIS
    PageNumber = kvp.Value.PageNumber,              // ADD THIS
    IsVerified = false,
    ExtractedAt = DateTime.UtcNow
};
```

Also update the variable declaration around line 344:

```csharp
// OLD:
Dictionary<string, (string Value, float Confidence)> extractedData;

// NEW:
Dictionary<string, (string Value, float Confidence, string? BoundingRegions, int? PageNumber)> extractedData;
```

### 3. Update DTOs (5 minutes)

**File:** `/backend/AcordParser.Core/DTOs/DocumentDTOs.cs`

Find the `ExtractedFieldDTO` record and add bounding box properties:

```csharp
public record ExtractedFieldDTO(
    Guid Id,
    string FieldName,
    string FieldValue,
    float Confidence,
    bool IsVerified,
    string? EditedValue,
    string? BoundingRegions,  // ADD THIS
    int? PageNumber            // ADD THIS
);
```

Then update `DocumentDetailResponse` mapping in DocumentService around line 230-237:

```csharp
var fields = document.ExtractedFields
    .Select(f => new ExtractedFieldDTO(
        f.Id,
        f.FieldName,
        f.FieldValue,
        f.Confidence,
        f.IsVerified,
        f.EditedValue,
        f.BoundingRegions,  // ADD THIS
        f.PageNumber         // ADD THIS
    ))
    .ToList();
```

### 4. Create Database Migration (2 minutes)

```bash
cd backend/AcordParser.API
dotnet ef migrations add AddFieldBoundingBoxes
dotnet ef database update
```

---

## Frontend Tasks Remaining

### 1. Update TypeScript Interface (2 minutes)

**File:** `/frontend/src/app/core/services/document.service.ts`

Update the `ExtractedField` interface:

```typescript
export interface ExtractedField {
  id: string;
  fieldName: string;
  fieldValue: string;
  confidence: number;
  isVerified: boolean;
  editedValue?: string;
  boundingRegions?: string;  // ADD THIS
  pageNumber?: number;        // ADD THIS
}
```

### 2. Create Highlight Overlay Component (30 minutes)

**Create new file:** `/frontend/src/app/features/documents/document-highlight-overlay/document-highlight-overlay.component.ts`

```typescript
import { Component, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BoundingRegion {
  page: number;
  polygon: Array<{x: number; y: number}>;
}

@Component({
  selector: 'app-document-highlight-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute inset-0 pointer-events-none">
      @if (highlightBox(); as box) {
        <div
          class="absolute border-4 border-yellow-400 bg-yellow-200/30 transition-opacity duration-300 pointer-events-none"
          [style.left.%]="box.left"
          [style.top.%]="box.top"
          [style.width.%]="box.width"
          [style.height.%]="box.height"
          [class.opacity-0]="!box.visible"
        ></div>
      }
    </div>
  `
})
export class DocumentHighlightOverlayComponent {
  activeFieldId = input<string | null>(null);
  boundingRegions = input<string | null>(null);
  pageNumber = input<number | null>(null);
  currentPage = input<number>(1);

  highlightBox = computed(() => {
    const regions = this.boundingRegions();
    const fieldId = this.activeFieldId();
    const page = this.currentPage();

    if (!regions || !fieldId) return null;

    try {
      const parsed: BoundingRegion[] = JSON.parse(regions);
      const pageRegion = parsed.find(r => r.page === page);

      if (!pageRegion) return null;

      // Convert polygon to bounding box
      const xs = pageRegion.polygon.map(p => p.x * 100);
      const ys = pageRegion.polygon.map(p => p.y * 100);

      return {
        left: Math.min(...xs),
        top: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        visible: true
      };
    } catch {
      return null;
    }
  });

  // Auto-hide after 3 seconds
  constructor() {
    effect(() => {
      const fieldId = this.activeFieldId();
      if (fieldId) {
        setTimeout(() => {
          // Highlight will fade due to parent clearing activeFieldId
        }, 3000);
      }
    });
  }
}
```

### 3. Update Document Detail Component (15 minutes)

**File:** `/frontend/src/app/features/documents/document-detail/document-detail.component.ts`

Add:

```typescript
// Add to imports
import { DocumentHighlightOverlayComponent } from '../document-highlight-overlay/document-highlight-overlay.component';

// Add to component imports array
imports: [
  // ... existing imports
  DocumentHighlightOverlayComponent
],

// Add new signal
activeFieldForHighlight = signal<ExtractedField | null>(null);

// Add method
onFieldClick(field: ExtractedField) {
  this.activeFieldForHighlight.set(field);
  setTimeout(() => this.activeFieldForHighlight.set(null), 3000);
}
```

**File:** `/frontend/src/app/features/documents/document-detail/document-detail.component.html`

Update the document preview section (around line 155):

```html
<div class="overflow-hidden rounded-lg border bg-card" [style.width.%]="splitPosition()">
  <div class="h-full flex flex-col">
    <div class="p-3 border-b bg-muted/50">
      <h3 class="text-sm font-medium">Document Preview</h3>
    </div>
    <div class="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 relative">
      @if (doc.fileUrl?.toLowerCase().endsWith('.pdf')) {
        <iframe [src]="safeFileUrl()" class="w-full h-full" frameborder="0"></iframe>
      } @else {
        <div class="flex items-center justify-center h-full p-4 relative">
          <img [src]="doc.fileUrl" alt="Document" class="max-w-full max-h-full object-contain" />

          <!-- ADD THIS OVERLAY -->
          @if (activeFieldForHighlight(); as field) {
            <app-document-highlight-overlay
              [activeFieldId]="field.id"
              [boundingRegions]="field.boundingRegions"
              [pageNumber]="field.pageNumber"
              [currentPage]="1"
            />
          }
        </div>
      }
    </div>
  </div>
</div>
```

Add click handler to field items (around line 317):

```html
<div class="flex-1 min-w-0" (click)="onFieldClick(field)">
  <app-extracted-field-item
    [field]="field"
    [isEditing]="editingField() === field.id"
    (editRequested)="onEditRequested($event)"
    (saveRequested)="onSaveField($event)"
    (cancelRequested)="onCancelEdit()"
    (verifyRequested)="onVerifyField($event)"
    (copyRequested)="onCopyToClipboard($event)"
  />
  ...
</div>
```

---

## Testing Steps

1. **Backend Test:**
   ```bash
   cd backend/AcordParser.API
   dotnet build
   dotnet ef database update
   dotnet run
   ```

2. **Upload a test document** via Swagger or frontend

3. **Check database** to verify `BoundingRegions` and `PageNumber` are populated:
   ```sql
   SELECT TOP 5 FieldName, PageNumber, LEFT(BoundingRegions, 100)
   FROM ExtractedFields
   WHERE BoundingRegions IS NOT NULL
   ```

4. **Frontend Test:**
   - Navigate to document detail page
   - Enable split view
   - Click on a field
   - Should see yellow highlight box appear on document

---

## Troubleshooting

**No bounding boxes appearing:**
- Check browser console for errors
- Verify `boundingRegions` field is not null in API response
- Check that polygon coordinates are valid (0-1 range)

**Highlight in wrong position:**
- Azure coordinates are normalized (0-1)
- Multiply by 100 to convert to percentages
- Ensure image/PDF dimensions are correct

**PDF highlighting not working:**
- PDFs use iframe, can't overlay directly
- Alternative: Use PDF.js to render PDF to canvas
- Or: Show "Field on page X" indicator instead

---

## Estimated Time

- Backend: **~25 minutes**
- Frontend: **~50 minutes**
- Testing: **~15 minutes**
- **Total: ~90 minutes**

---

## Alternative: Simpler Implementation

If bounding box highlighting is too complex for now, here's a simpler alternative:

**Show page number indicator:**

```typescript
onFieldClick(field: ExtractedField) {
  if (field.pageNumber) {
    this.toastService.info(
      `Field location`,
      `${field.fieldName} is on page ${field.pageNumber}`
    );
  }
}
```

This provides basic location info without visual highlighting.

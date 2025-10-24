import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { ExtractedField } from '../../../core/services/document.service';

@Component({
  selector: 'app-extracted-field-item',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...HlmButtonImports,
    ...HlmBadgeImports,
    ...HlmInputImports
  ],
  templateUrl: './extracted-field-item.component.html',
  styleUrls: ['./extracted-field-item.component.css']
})
export class ExtractedFieldItemComponent {
  // Inputs
  field = input.required<ExtractedField>();
  isEditing = input<boolean>(false);

  // Outputs
  editRequested = output<ExtractedField>();
  saveRequested = output<{ field: ExtractedField; value: string }>();
  cancelRequested = output<void>();
  verifyRequested = output<ExtractedField>();
  copyRequested = output<{ value: string; fieldName: string }>();

  // Local state
  editValue = signal('');

  onEdit() {
    const f = this.field();
    this.editValue.set(f.editedValue || f.fieldValue);
    this.editRequested.emit(f);
  }

  onSave() {
    this.saveRequested.emit({
      field: this.field(),
      value: this.editValue()
    });
  }

  onCancel() {
    this.editValue.set('');
    this.cancelRequested.emit();
  }

  onVerify() {
    this.verifyRequested.emit(this.field());
  }

  onCopy() {
    const f = this.field();
    const value = f.editedValue || f.fieldValue;
    this.copyRequested.emit({ value, fieldName: f.fieldName });
  }

  getConfidenceClass(confidence: number): string {
    if (confidence > 0.8) return 'high';
    if (confidence > 0.6) return 'medium';
    return 'low';
  }
}

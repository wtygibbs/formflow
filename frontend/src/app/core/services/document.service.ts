import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentListItem {
  id: string;
  fileName: string;
  status: number;
  uploadedAt: string;
  processedAt?: string;
  extractedFieldsCount: number;
}

export interface ExtractedField {
  id: string;
  fieldName: string;
  fieldValue: string;
  confidence: number;
  isVerified: boolean;
  editedValue?: string;
}

export interface DocumentDetail {
  id: string;
  fileName: string;
  status: number;
  uploadedAt: string;
  processedAt?: string;
  processingError?: string;
  extractedFields: ExtractedField[];
}

export interface UploadDocumentResponse {
  documentId: string;
  fileName: string;
  status: number;
}

export interface PaginationRequest {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private http = inject(HttpClient);

  uploadDocument(file: File): Observable<UploadDocumentResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadDocumentResponse>(
      `${environment.apiUrl}/documents/upload`,
      formData
    );
  }

  getDocuments(): Observable<DocumentListItem[]> {
    return this.http.get<DocumentListItem[]>(`${environment.apiUrl}/documents`);
  }

  getDocumentsPaginated(params: PaginationRequest): Observable<PaginatedResponse<DocumentListItem>> {
    const queryParams: any = {
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    };

    if (params.search) queryParams.search = params.search;
    if (params.status) queryParams.status = params.status;
    if (params.fromDate) queryParams.fromDate = params.fromDate;
    if (params.toDate) queryParams.toDate = params.toDate;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

    return this.http.get<PaginatedResponse<DocumentListItem>>(
      `${environment.apiUrl}/documents/paginated`,
      { params: queryParams }
    );
  }

  getDocument(id: string): Observable<DocumentDetail> {
    return this.http.get<DocumentDetail>(`${environment.apiUrl}/documents/${id}`);
  }

  updateField(fieldId: string, editedValue: string, isVerified: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${environment.apiUrl}/documents/fields/${fieldId}`,
      { editedValue, isVerified }
    );
  }

  exportDocument(id: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/documents/${id}/export`, {
      responseType: 'blob'
    });
  }

  downloadCsv(documentId: string, fileName: string): void {
    this.exportDocument(documentId).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  }
}

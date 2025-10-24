import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  DocumentService,
  DocumentListItem,
  DocumentDetail,
  UploadDocumentResponse,
  PaginationRequest,
  PaginatedResponse
} from './document.service';
import { environment } from '../../../environments/environment';

describe('DocumentService', () => {
  let service: DocumentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DocumentService]
    });

    service = TestBed.inject(DocumentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('uploadDocument', () => {
    it('should upload a document successfully', (done) => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const mockResponse: UploadDocumentResponse = {
        documentId: 'doc-123',
        fileName: 'test.pdf',
        status: 0
      };

      service.uploadDocument(mockFile).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.documentId).toBe('doc-123');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/documents/upload`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle upload error', (done) => {
      const mockFile = new File(['test'], 'oversized.pdf', { type: 'application/pdf' });

      service.uploadDocument(mockFile).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.status).toBe(400);
          done();
        }
      );

      const req = httpMock.expectOne(`${environment.apiUrl}/documents/upload`);
      req.flush(
        { error: 'File too large' },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('getDocuments', () => {
    it('should retrieve all documents', (done) => {
      const mockDocuments: DocumentListItem[] = [
        {
          id: 'doc-1',
          fileName: 'document1.pdf',
          status: 2,
          uploadedAt: '2024-01-01T10:00:00Z',
          processedAt: '2024-01-01T10:05:00Z',
          extractedFieldsCount: 15
        },
        {
          id: 'doc-2',
          fileName: 'document2.pdf',
          status: 1,
          uploadedAt: '2024-01-02T11:00:00Z',
          extractedFieldsCount: 0
        }
      ];

      service.getDocuments().subscribe(documents => {
        expect(documents).toEqual(mockDocuments);
        expect(documents.length).toBe(2);
        expect(documents[0].fileName).toBe('document1.pdf');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/documents`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDocuments);
    });

    it('should return empty array when no documents exist', (done) => {
      service.getDocuments().subscribe(documents => {
        expect(documents).toEqual([]);
        expect(documents.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/documents`);
      req.flush([]);
    });
  });

  describe('getDocumentsPaginated', () => {
    it('should retrieve paginated documents', (done) => {
      const params: PaginationRequest = {
        page: 1,
        pageSize: 10
      };

      const mockResponse: PaginatedResponse<DocumentListItem> = {
        data: [
          {
            id: 'doc-1',
            fileName: 'test.pdf',
            status: 2,
            uploadedAt: '2024-01-01T10:00:00Z',
            extractedFieldsCount: 10
          }
        ],
        totalCount: 25,
        page: 1,
        pageSize: 10,
        totalPages: 3,
        hasPreviousPage: false,
        hasNextPage: true
      };

      service.getDocumentsPaginated(params).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.data.length).toBe(1);
        expect(response.totalCount).toBe(25);
        expect(response.hasNextPage).toBe(true);
        done();
      });

      const req = httpMock.expectOne(
        req => req.url.includes(`${environment.apiUrl}/documents/paginated`)
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('10');
      req.flush(mockResponse);
    });

    it('should include optional query parameters', (done) => {
      const params: PaginationRequest = {
        page: 2,
        pageSize: 5,
        search: 'insurance',
        status: 'Completed',
        sortBy: 'uploadedAt',
        sortOrder: 'desc'
      };

      const mockResponse: PaginatedResponse<DocumentListItem> = {
        data: [],
        totalCount: 0,
        page: 2,
        pageSize: 5,
        totalPages: 0,
        hasPreviousPage: true,
        hasNextPage: false
      };

      service.getDocumentsPaginated(params).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(
        req => req.url.includes(`${environment.apiUrl}/documents/paginated`)
      );
      expect(req.request.params.get('search')).toBe('insurance');
      expect(req.request.params.get('status')).toBe('Completed');
      expect(req.request.params.get('sortBy')).toBe('uploadedAt');
      expect(req.request.params.get('sortOrder')).toBe('desc');
      req.flush(mockResponse);
    });
  });

  describe('getDocument', () => {
    it('should retrieve document details', (done) => {
      const documentId = 'doc-123';
      const mockDocument: DocumentDetail = {
        id: documentId,
        fileName: 'policy.pdf',
        status: 2,
        uploadedAt: '2024-01-01T10:00:00Z',
        processedAt: '2024-01-01T10:05:00Z',
        extractedFields: [
          {
            id: 'field-1',
            fieldName: 'PolicyNumber',
            fieldValue: 'POL-12345',
            confidence: 0.95,
            isVerified: true,
            editedValue: 'POL-12345-CORRECTED'
          },
          {
            id: 'field-2',
            fieldName: 'InsuredName',
            fieldValue: 'John Doe',
            confidence: 0.92,
            isVerified: false
          }
        ]
      };

      service.getDocument(documentId).subscribe(document => {
        expect(document).toEqual(mockDocument);
        expect(document.extractedFields.length).toBe(2);
        expect(document.extractedFields[0].fieldName).toBe('PolicyNumber');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/documents/${documentId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDocument);
    });

    it('should handle document not found', (done) => {
      const documentId = 'nonexistent';

      service.getDocument(documentId).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.status).toBe(404);
          done();
        }
      );

      const req = httpMock.expectOne(`${environment.apiUrl}/documents/${documentId}`);
      req.flush({ error: 'Document not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('updateField', () => {
    it('should update field successfully', (done) => {
      const fieldId = 'field-123';
      const editedValue = 'Corrected Value';
      const isVerified = true;
      const mockResponse = { message: 'Field updated successfully' };

      service.updateField(fieldId, editedValue, isVerified).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/documents/fields/${fieldId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ editedValue, isVerified });
      req.flush(mockResponse);
    });

    it('should handle update error', (done) => {
      const fieldId = 'field-123';
      const editedValue = 'New Value';
      const isVerified = false;

      service.updateField(fieldId, editedValue, isVerified).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.status).toBe(403);
          done();
        }
      );

      const req = httpMock.expectOne(`${environment.apiUrl}/documents/fields/${fieldId}`);
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('exportDocument', () => {
    it('should export document as blob', (done) => {
      const documentId = 'doc-123';
      const mockBlob = new Blob(['CSV content'], { type: 'text/csv' });

      service.exportDocument(documentId).subscribe(blob => {
        expect(blob).toBeTruthy();
        expect(blob.type).toBe('text/csv');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/documents/${documentId}/export`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(mockBlob);
    });

    it('should handle export error', (done) => {
      const documentId = 'doc-123';

      service.exportDocument(documentId).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.status).toBe(500);
          done();
        }
      );

      const req = httpMock.expectOne(`${environment.apiUrl}/documents/${documentId}/export`);
      // For blob responses, flush with a Blob even for errors
      req.flush(
        new Blob(['Export failed'], { type: 'text/plain' }),
        { status: 500, statusText: 'Internal Server Error' }
      );
    });
  });

  describe('downloadCsv', () => {
    it('should trigger CSV download', (done) => {
      const documentId = 'doc-123';
      const fileName = 'test-document';
      const mockBlob = new Blob(['CSV content'], { type: 'text/csv' });

      // Spy on document methods
      const createElementSpy = spyOn(document, 'createElement').and.callThrough();
      const appendChildSpy = spyOn(document.body, 'appendChild').and.callThrough();
      const removeChildSpy = spyOn(document.body, 'removeChild').and.callThrough();

      // Execute download
      service.downloadCsv(documentId, fileName);

      // Verify HTTP request
      const req = httpMock.expectOne(`${environment.apiUrl}/documents/${documentId}/export`);
      req.flush(mockBlob);

      // Wait for async operations
      setTimeout(() => {
        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        done();
      }, 100);
    });
  });
});

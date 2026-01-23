/**
 * @file s3Service.test.ts
 * @description Tests for S3/COS service image upload functionality
 */
import { describe, it, expect, vi } from 'vitest';

// Mock localStorage globally
const localStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock the COS SDK
const mockPutObject = vi.fn();
const mockHeadBucket = vi.fn();

vi.mock('cos-js-sdk-v5', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      putObject: mockPutObject,
      headBucket: mockHeadBucket
    }))
  };
});

// Import after mocks
import { S3Service } from './s3Service';

describe('S3Service Image Upload Blob Conversion', () => {
  let s3Service: S3Service;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset mock implementations
    mockPutObject.mockImplementation((params, callback) => {
      console.log('[Mock COS] putObject called with:', {
        Bucket: params.Bucket,
        Region: params.Region,
        Key: params.Key,
        BodyType: params.Body?.constructor?.name,
        ContentType: params.ContentType
      });
      
      // Check if Body is a Blob (the fix we implemented)
      if (params.Body instanceof Blob) {
        callback(null, { statusCode: 200 });
      } else {
        // Simulate the original error that was happening
        callback(new Error('params body format error, Only allow File|Blob|String'), null);
      }
    });
    
    mockHeadBucket.mockImplementation((params, callback) => {
      callback(null, { statusCode: 200 });
    });
    
    // Create new service instance
    s3Service = new S3Service();
    
    // Configure with test credentials
    s3Service.saveConfig({
      bucketName: 'test-bucket-1234567890',
      region: 'ap-test',
      secretId: 'test-secret-id',
      secretKey: 'test-secret-key'
    });
  });

  it('should convert ArrayBuffer to Blob before upload', async () => {
    // Create test ArrayBuffer (simulating image data)
    const testData = new ArrayBuffer(1024);
    const view = new Uint8Array(testData);
    for (let i = 0; i < view.length; i++) {
      view[i] = i % 256; // Fill with test data
    }

    // Test upload
    const result = await s3Service.uploadImage('test-image.jpg', testData);
    
    expect(result).toBe(true);
    expect(mockPutObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: 'images/test-image.jpg',
        ContentType: 'image/jpeg',
        Body: expect.any(Blob)
      }),
      expect.any(Function)
    );
  });

  it('should handle Blob input correctly', async () => {
    // Create test Blob
    const testBlob = new Blob(['test image data'], { type: 'image/jpeg' });

    // Test upload
    const result = await s3Service.uploadImage('test-image.jpg', testBlob);
    
    expect(result).toBe(true);
    expect(mockPutObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: 'images/test-image.jpg',
        ContentType: 'image/jpeg',
        Body: testBlob
      }),
      expect.any(Function)
    );
  });

  it('should convert base64 string to Blob before upload', async () => {
    // Create test base64 string (simulating image data)
    const testBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';

    // Test upload
    const result = await s3Service.uploadImage('test-image.jpg', testBase64);
    
    expect(result).toBe(true);
    expect(mockPutObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: 'images/test-image.jpg',
        ContentType: 'image/jpeg',
        Body: expect.any(Blob)
      }),
      expect.any(Function)
    );
  });

  it('should handle plain base64 string without data URL prefix', async () => {
    // Create test base64 string without data URL prefix
    const testBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';

    // Test upload
    const result = await s3Service.uploadImage('test-image.jpg', testBase64);
    
    expect(result).toBe(true);
    expect(mockPutObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: 'images/test-image.jpg',
        ContentType: 'image/jpeg',
        Body: expect.any(Blob)
      }),
      expect.any(Function)
    );
  });

  it('should reject unsupported data types', async () => {
    // Test with unsupported data type
    const unsupportedData = { invalid: 'data' } as any;

    await expect(s3Service.uploadImage('test-image.jpg', unsupportedData))
      .rejects.toThrow('Unsupported buffer type');
  });

  it('should fail when COS SDK rejects non-Blob data (simulating original bug)', async () => {
    // Override mock to simulate the original bug where Uint8Array was rejected
    mockPutObject.mockImplementation((params, callback) => {
      if (params.Body instanceof Uint8Array) {
        callback(new Error('params body format error, Only allow File|Blob|String'), null);
      } else {
        callback(null, { statusCode: 200 });
      }
    });

    // Create Uint8Array data (this would have failed before the fix)
    const uint8Data = new Uint8Array([1, 2, 3, 4]);
    
    // Our fix should convert this to Blob, so it should succeed
    const result = await s3Service.uploadImage('test-image.jpg', uint8Data.buffer);
    
    expect(result).toBe(true);
    // Verify that the data was converted to Blob before being passed to COS SDK
    expect(mockPutObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Body: expect.any(Blob)
      }),
      expect.any(Function)
    );
  });
});
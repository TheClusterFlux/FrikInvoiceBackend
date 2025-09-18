# MongoDB Interface Guide for TheClusterFlux Projects

This document outlines how to interface with the MongoDB instance used across TheClusterFlux projects, based on the homepage project implementation. This guide is language-agnostic and focuses on general patterns and concepts.

## Overview

The MongoDB instance is deployed in Kubernetes and accessible via:
- **Production**: `mongodb.default.svc.cluster.local:27017`
- **Local Development**: `localhost:27016`

## Connection Configuration

### Environment Variables
```bash
# Required environment variables
MONGO_PASSWORD=<password_from_secret>
IS_LOCAL=true  # Set to 'true' for local development, false/undefined for production
```

### Connection String Logic
The connection string should be constructed based on the environment:

**Local Development:**
```
mongodb://root:<MONGO_PASSWORD>@localhost:27016
```

**Production:**
```
mongodb://root:<MONGO_PASSWORD>@mongodb.default.svc.cluster.local:27017
```

**Implementation Pattern:**
1. Check `IS_LOCAL` environment variable
2. Use appropriate host and port based on environment
3. Always use root user with password authentication

## Database Structure

### Database Name
- **Database**: `homepage`

### Collections
1. **`creators`** - Creator/author information
2. **`projects`** - Project data and metadata  
3. **`technologies`** - Technology stack information

### GridFS Buckets
- **`thumbnails`** - Project thumbnail images stored as files

## Basic Connection Pattern

**General Pattern:**
1. Create MongoDB client instance
2. Connect to database
3. Perform operations
4. Handle errors appropriately
5. Always close connection in finally block

**Key Principles:**
- Use connection pooling for production applications
- Implement proper error handling and logging
- Always close connections to prevent resource leaks
- Use async/await or equivalent patterns for non-blocking operations

## Common Operations

### 1. Reading Data
**Pattern:** Query collections to retrieve all documents
- `creators` collection: Get all creator records
- `projects` collection: Get all project records  
- `technologies` collection: Get all technology records

### 2. Writing Data
**Pattern:** Insert single documents into collections
- Validate data structure before insertion
- Remove sensitive fields (like passwords) before storing
- Use appropriate collection based on data type

### 3. File Storage with GridFS
**Pattern:** Use GridFS bucket for file storage
- Upload files to `thumbnails` bucket
- Use consistent naming conventions
- Handle file streams appropriately for your language

## Security Considerations

### Password Protection
**Pattern:** All write operations require password validation
1. Extract password from incoming data
2. Compare against environment variable `PASSWORD`
3. Reject operation if password doesn't match
4. Remove password field from data before database storage

### Data Validation
**Pattern:** Validate data structure before database operations
- Check required fields are present
- Validate data types and formats
- Reject invalid data with descriptive error messages

**Required Fields by Collection:**
- **Projects**: title, description, author, links, tech, fileType
- **Creators**: name, github
- **Technologies**: name, description

## Error Handling Best Practices

**General Pattern:**
1. Wrap database operations in try-catch blocks
2. Log errors with sufficient detail for debugging
3. Rethrow errors to be handled by calling code
4. Always close connections in finally blocks
5. Use appropriate error codes and messages

## Language-Specific Considerations

### Python
- Use `pymongo` library
- Implement connection pooling with `MongoClient`
- Use context managers for connection handling

### Java
- Use MongoDB Java Driver
- Implement proper resource management with try-with-resources
- Use connection pooling configurations

### Go
- Use official MongoDB Go Driver
- Implement proper context handling
- Use connection pooling with appropriate settings

### C#
- Use MongoDB .NET Driver
- Implement proper async/await patterns
- Use connection pooling configurations

### Node.js
- Use `mongodb` npm package
- Implement proper promise/async handling
- Use connection pooling for production

## Kubernetes Deployment

### Environment Variables in Deployment
```yaml
env:
- name: MONGO_PASSWORD
  valueFrom:
    secretKeyRef:
      name: mongodb 
      key: mongodb-root-password
- name: PASSWORD
  valueFrom:
    secretKeyRef:
      name: homepage-password
      key: password
```

## File Naming Conventions

**Pattern:** Consistent file naming for GridFS storage
- Replace spaces with underscores in filenames
- Use consistent file extensions based on `fileType` field
- Store original filename in document metadata
- Maintain filename consistency across upload/download operations

## Implementation Examples

See `src/dataManagement.js` in the homepage project for complete implementation examples including:
- Data fetching and local storage
- Project creation with file uploads
- Creator and technology management
- Error handling patterns

## Best Practices Summary

1. **Connection Management**
   - Use environment-aware connection strings
   - Implement connection pooling for production
   - Always close connections properly

2. **Security**
   - Validate passwords for write operations
   - Remove sensitive data before storage
   - Validate all input data structures

3. **Error Handling**
   - Implement comprehensive error handling
   - Log errors with sufficient detail
   - Use appropriate error propagation

4. **File Handling**
   - Use GridFS for file storage
   - Implement consistent naming conventions
   - Handle file streams appropriately

5. **Data Validation**
   - Validate required fields before operations
   - Check data types and formats
   - Provide descriptive error messages

## Notes

- Always use connection pooling for production applications
- Implement proper logging for debugging
- Consider implementing retry logic for connection failures
- Use transactions for multi-document operations when needed
- Follow language-specific MongoDB driver documentation for implementation details
